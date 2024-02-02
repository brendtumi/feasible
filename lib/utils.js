const { readFileSync, writeFileSync, access, unlink, constants } = require('fs');
const { extname, dirname } = require('path');
const { createHash } = require('crypto');
const makeDir = require('make-dir');
const { load, dump } = require('js-yaml');
const globby = require('globby');
const execShPromise = require('exec-sh').promise;
const get = require('lodash.get');
const isBase64 = require('is-base64');
const fetch = require('node-fetch');
const { parse } = require('json5');
const ivm = require('isolated-vm');
const log = require('./logs')();

const regexVar = /\${(?<var>[a-zA-Z0-9-_.]+)(\.val)?(\.name)?}/gi;

function loadByExt(path, contents) {
  switch (extname(path)) {
    case '.json': {
      const json = JSON.parse(contents);
      return { checksum: generateChecksum(json), configuration: json, file: path };
    }
    case '.json5': {
      const json5 = parse(contents);
      return { checksum: generateChecksum(json5), configuration: json5, file: path };
    }
    case '.yml': {
      const yml = load(contents);
      return { checksum: generateChecksum(yml), configuration: yml, file: path };
    }
  }
  throw new Error(`Unsupported file format "${path}"`);
}

async function parseConfigFile(config, url) {
  if (url) {
    try {
      const contents = await fetch(url).then((res) => res.text());
      return loadByExt(url, contents);
    } catch (e) {
      throw new Error(`Parse error on "${url}": ${e.message}`);
    }
  } else {
    const [firstMatch] = await globby(config);
    if (firstMatch) {
      try {
        const contents = readFileSync(firstMatch, 'utf8').toString();
        return loadByExt(firstMatch, contents);
      } catch (e) {
        throw new Error(`Parse error on "${firstMatch}": ${e.message}`);
      }
    }
    throw new Error(`Config file not found! "${config}"`);
  }
}

async function cloneRepository({ repository }, variables) {
  const download = require('download-git-repo');
  const url = replaceVariableInString(repository.url, variables);
  log.warn(`Cloning ${url} to ${repository.target}`);
  return new Promise((resolve, reject) => {
    download(url, repository.target, { clone: true }, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function generateChecksum(obj, algorithm, encoding) {
  return createHash(algorithm || 'md5')
    .update(JSON.stringify(obj), 'utf8')
    .digest(encoding || 'hex');
}

async function promptUI(configuration, lock) {
  const { prompt } = require('inquirer');
  const prompts = Object.entries(configuration.variables).map(
    ([name, { question, type = 'input', options, initial }]) => {
      if (type === 'base64' || type === 'base64()') {
        return {
          type: 'input',
          name,
          message: question,
          choices: options,
          default: lock.getVariableValue(name, initial, options),
          filter: (val) => {
            return isBase64(val) ? val : Buffer.from(val).toString('base64');
          },
        };
      }
      if (type === 'random' || type === 'random()' || initial === 'random()') {
        const { v4: uuidv4 } = require('uuid');
        return {
          type: 'input',
          name,
          message: question,
          default: lock.getVariableValue(name, uuidv4(), options),
        };
      }
      return {
        type: options && Array.isArray(options) && options.length ? 'list' : type === 'string' ? 'input' : type,
        name,
        message: question,
        choices: options,
        default: lock.getVariableValue(name, initial, options),
      };
    },
  );
  return prompt(prompts);
}

async function resolveVariables(variables, defaults, { separator }) {
  const resolved = {};
  for (const [name, value] of Object.entries(defaults)) {
    if (typeof value === 'object' && value.type === 'bash') {
      const command = replaceVariableInString(value.command, { ...variables, ...resolved }, separator);

      const out = await execShPromise(command, true);
      let parsed;
      if (out.stderr.length > 0) {
        log.error(`Resolve variable "${name}": ${out.stderr}`);
        parsed = out.stderr.toString().trim();
      } else {
        log.info(`Resolving variable "${name}"`);
        parsed = out.stdout.toString().trim();
      }
      parsed = 'output' in value && value.output === 'json' ? JSON.parse(parsed) : parsed;
      resolved[name] = 'query' in value ? get(parsed, value.query) : parsed;

      log.success(`"${name}" resolved to: ${resolved[name]}`);
    } else {
      resolved[name] = value;
    }
  }
  return { ...variables, ...resolved };
}

async function execHook(hooks, configuration, variables, parallel, separator) {
  const hks = typeof hooks === 'string' ? [hooks] : hooks;
  for (const hook of hks) {
    if (
      configuration &&
      'actions' in configuration &&
      hook in configuration.actions &&
      configuration.actions[hook].length
    ) {
      if (parallel) {
        const concurrently = require('concurrently');
        await concurrently(
          configuration.actions[hook].map((command, i) => ({
            command: replaceVariableInString(command, variables, separator),
            name: `action:${hook}#${i + 1}`,
          })),
        );
      } else {
        for (let i = 0; i < configuration.actions[hook].length; i++) {
          const actionElement = configuration.actions[hook][i];
          let out;
          try {
            out = await execShPromise(replaceVariableInString(actionElement, variables, separator), true);
          } catch (e) {
            log.error(`action:${hook}#${i + 1}: ${e.stderr}`);
            throw Error(e);
          }
          if (out.stderr.length > 0) {
            log.error(`action:${hook}#${i + 1}: ${out.stderr}`);
          } else {
            log.info(`action:${hook}#${i + 1}: ${out.stdout}`);
          }
        }
      }
    }
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function replaceVariableInString(file, vars, separator) {
  if (!regexVar.test(file)) {
    return file;
  }
  const uniqueVariables = file.match(regexVar).filter((v, i, a) => a.indexOf(v) === i);
  for (const uniqueVariable of uniqueVariables) {
    const variable = uniqueVariable.replace(regexVar, '$1');
    if (variable === undefined) {
      throw new Error(``)
    }
    else if (variable.includes('.val')) {
      const escape = variable.includes('.unescape');
      const genVar = vars[variable.replace('.val', '').replace('.unescape', '')];
      if( genVar === undefined ){
        throw new Error(`Variable "${variable} not found in the variables list`);
      }
      file = replaceAll(file, uniqueVariable, genVar.toString().includes(' ') && !escape ? `'${genVar}'` : genVar);
    } else if (variable.endsWith('.name') && variable.replace('.name', '') in vars) {
      file = replaceAll(file, uniqueVariable, variable.replace('.name', ''));
    } else if (variable.endsWith('.env') && variable.replace('.env', '') in process.env) {
      file = replaceAll(file, uniqueVariable, process.env[variable.replace('.env', '')]);
    } else {
      if( vars[variable] === undefined ){
        throw new Error(`Variable "${variable} not found in the variables list`);
      }
      const genVar = vars[variable].toString().includes(' ') ? `'${vars[variable]}'` : vars[variable];
      file = replaceAll(file, uniqueVariable, [variable, genVar].join(separator));
    }
  }
  return file;
}

function objectFileType(file, variables) {
  if (file.type === 'json') {
    return JSON.stringify(
      file.variables.reduce((a, c) => {
        if (typeof c === 'string') {
          a[c] = variables[c];
        } else {
          a[c[0]] = variables[c[1]];
        }
        return a;
      }, {}),
    );
  }
  if (file.type === 'yaml') {
    return dump(
      file.variables.reduce((a, c) => {
        if (typeof c === 'string') {
          a[c] = variables[c];
        } else {
          a[c[0]] = variables[c[1]];
        }
        return a;
      }, {}),
    );
  }
  if (file.type === 'env') {
    return replaceVariableInString(
      file.variables
        .map((x) => {
          return typeof x === 'string' ? '${' + x + '}' : x[0] + '=${' + x[1] + '.val}';
        })
        .join('\n'),
      variables,
      '=',
    );
  }
}

async function executeFiles(configuration, variables, lock, { separator }) {
  const paths = [];
  const generatedContents = {};
  const sandboxVariables = Object.fromEntries(Object.entries(variables).map(([k, v]) => [`$${k}`, v]));
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = await isolate.createContext();
  for (const key in sandboxVariables) {
    await context.global.set(key, new ivm.ExternalCopy(sandboxVariables[key]).copyInto());
  }

  if (configuration && 'files' in configuration) {
    for (const [path, file] of Object.entries(configuration.files)) {
      const sandboxContents = Object.fromEntries(
        Object.entries(generatedContents).map(([k, v]) => [k.replace(/[^a-z0-9]+/gi, '_'), v]),
      );

      if (typeof file === 'string') {
        generatedContents[path] = replaceVariableInString(file, { ...variables, ...sandboxContents }, separator);
      } else if (typeof file === 'object' && 'type' in file && 'variables' in file) {
        generatedContents[path] = objectFileType(file, { ...variables, ...sandboxContents });
      } else if (
        typeof file === 'object' &&
        'condition' in file &&
        ('content' in file || ('success' in file && 'fail' in file))
      ) {
        const contextVariables = {...Object.fromEntries(Object.entries(sandboxContents).map(([k, v]) => [`$${k}`, v]))};
        for (const key in contextVariables) {
          await context.global.set(key, new ivm.ExternalCopy(contextVariables[key]).copyInto());
        }

        let isTruthy = false;
        try {
          isTruthy = !!(await context.eval(file.condition));
        } catch (e) {
          log.warn(`Custom condition on "${path}" throws an error: ${e.message}`);
        }
        if (isTruthy) {
          if ('success' in file && 'fail' in file) {
            generatedContents[path] =
              typeof file.success === 'object' && 'type' in file.success && 'variables' in file.success
                ? objectFileType(file.success, { ...variables, ...sandboxContents })
                : replaceVariableInString(file.success, { ...variables, ...sandboxContents }, separator);
          } else {
            generatedContents[path] =
              typeof file.content === 'object' && 'type' in file.content && 'variables' in file.content
                ? objectFileType(file.content, { ...variables, ...sandboxContents })
                : replaceVariableInString(file.content, { ...variables, ...sandboxContents }, separator);
          }
        } else {
          if ('success' in file && 'fail' in file) {
            generatedContents[path] =
              typeof file.fail === 'object' && 'type' in file.fail && 'variables' in file.fail
                ? objectFileType(file.fail, { ...variables, ...sandboxContents })
                : replaceVariableInString(file.fail, { ...variables, ...sandboxContents }, separator);
          } else {
            log.aligned(path, 'Condition not met.', '.', 'warn');
          }
        }
      } else {
        log.aligned(path, `Unrecognizable file type`, '.', 'warn');
      }
    }
  }
  for (const [path, generated] of Object.entries(generatedContents)) {
    await makeDir(dirname(path));
    writeFileSync(path, generated);
    paths.push(path);
    log.aligned(path, 'File Generated.');
  }
  return paths;
}

async function unlinkFile(file) {
  return new Promise((resolve) => {
    access(file, constants.F_OK | constants.W_OK, (err) => {
      if (!err) {
        unlink(file, () => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  parseConfigFile,
  resolveDefaultVariable: resolveVariables,
  promptUI,
  execHook,
  executeFiles,
  unlinkFile,
  cloneRepository,
};
