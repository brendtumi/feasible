const { readFileSync, writeFileSync, exists, unlink } = require('fs');
const { extname } = require('path');
const { createHash } = require('crypto');
const chalk = require('chalk');
const { load, dump } = require('js-yaml');
const globby = require('globby');
const boxen = require('boxen');

const regexVar = /\${(?<var>[a-zA-Z0-9-_.]+)(\.val)?(\.name)?}/gi;

function loadByExt(path, contents) {
  switch (extname(path)) {
    case '.json': {
      return { configuration: JSON.parse(contents), file: path };
    }
    case '.json5': {
      const { parse } = require('json5');
      return { configuration: parse(contents), file: path };
    }
    case '.yml': {
      return { configuration: load(contents), file: path };
    }
  }
  throw new Error(`Unsupported file format "${path}"`);
}

async function fetchConfigFile(url) {
  const fetch = require('node-fetch');
  try {
    const contents = await fetch(url).then((res) => res.text());
    return loadByExt(url, contents);
  } catch (e) {
    throw new Error(`Parse error on "${url}": ${e.message}`);
  }
}

async function readConfigFile(fileGlob) {
  const [firstMatch] = await globby(fileGlob);
  if (firstMatch) {
    try {
      const contents = readFileSync(firstMatch, 'utf8').toString();
      return loadByExt(firstMatch, contents);
    } catch (e) {
      throw new Error(`Parse error on "${firstMatch}": ${e.message}`);
    }
  }
  throw new Error(`Config file not found! "${fileGlob}"`);
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
      return {
        type: type === 'string' ? 'input' : type,
        name,
        message: question,
        choices: options,
        default: lock.getVariableValue(name, initial, options),
      };
    },
  );
  return prompt(prompts);
}

async function execHook(hook, configuration, variables, parallel, separator) {
  // TODO: place variables in commands if exist
  if (configuration && 'actions' in configuration && hook in configuration.actions) {
    if (parallel) {
      const concurrently = require('concurrently');
      await concurrently(
        configuration.actions[hook].map((command, i) => ({
          command: replaceVariableInString(command, variables, separator),
          name: `action:${hook}#${i + 1}`,
        })),
      );
    } else {
      const execShPromise = require('exec-sh').promise;
      for (let i = 0; i < configuration.actions[hook].length; i++) {
        const actionElement = configuration.actions[hook][i];
        let out;
        try {
          out = await execShPromise(replaceVariableInString(actionElement, variables, separator), true);
        } catch (e) {
          console.error(`action:${hook}#${i + 1}: ${chalk.red.italic(e.stderr)}`);
          return false;
        }
        if (out.stderr.length > 0) {
          console.error(`action:${hook}#${i + 1}: ${chalk.red.italic(out.stderr)}`);
        } else {
          console.log(`action:${hook}#${i + 1}: ${chalk.yellow.italic(out.stdout)}`);
        }
      }
    }
  }
  return true;
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
    if (variable.includes('.val')) {
      file = replaceAll(file, uniqueVariable, `'${vars[variable.replace('.val', '')]}'`);
    } else if (variable.includes('.name') && variable.replace('.name', '') in vars) {
      file = replaceAll(file, uniqueVariable, variable.replace('.name', ''));
    } else {
      file = replaceAll(file, uniqueVariable, [variable, `'${vars[variable]}'`].join(separator));
    }
  }
  return file;
}

function executeFiles(configuration, lock, { separator }) {
  const paths = [];
  if (configuration && 'files' in configuration) {
    const vars = { ...lock.answers, ...configuration.defaults };
    for (let [path, file] of Object.entries(configuration.files)) {
      let generated = '';
      console.log(chalk.blue(['-'.repeat(3), path, '-'.repeat(3)].join(' ')));
      if (typeof file === 'string') {
        generated = replaceVariableInString(file, vars, separator);
      } else if (typeof file === 'object') {
        switch (file.type) {
          case 'json': {
            generated = JSON.stringify(
              file.variables.reduce((a, c) => {
                if (typeof c === 'string') {
                  a[c] = vars[c];
                } else {
                  a[c[0]] = vars[c[1]];
                }
                return a;
              }, {}),
            );
            break;
          }
          case 'yaml': {
            generated = dump(
              file.variables.reduce((a, c) => {
                if (typeof c === 'string') {
                  a[c] = vars[c];
                } else {
                  a[c[0]] = vars[c[1]];
                }
                return a;
              }, {}),
            );
            break;
          }
          case 'env': {
            generated = replaceVariableInString(
              file.variables
                .map((x) => {
                  return typeof x === 'string' ? '${' + x + '}' : x[0] + '=${' + x[1] + '.val}';
                })
                .join('\n'),
              vars,
              '=',
            );
            break;
          }
        }
      }
      console.log(boxen(generated, { padding: 1, borderColor: 'blue', borderStyle: 'round' }));
      writeFileSync(path, generated);
      paths.push(path);
      console.log(chalk.green(['-'.repeat(3), 'created', '-'.repeat(3)].join(' ')));
      console.log('');
    }
  }
  return paths;
}

async function unlinkFile(file) {
  return new Promise((resolve) => {
    exists(file, (isIt) => {
      if (isIt) {
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
  readConfigFile,
  fetchConfigFile,
  generateChecksum,
  promptUI,
  execHook,
  executeFiles,
  unlinkFile,
};
