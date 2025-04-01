# Feasible

A question-answer based, configurable and automated development environment setup wizard that helps automate and standardize development environments across teams.

[![Node.js Version][node-version-image]][node-version-url]
[![NPM version][npm-image]][npm-url]
[![MIT License][license-image]][license-url]

## Features

- 🚀 Question-answer based configuration interface
- ⚙️ Configure via JSON, JSON5, or YAML
- 🌐 Remote configuration support
- 🔄 Git hooks integration
- 🎯 Conditional file generation
- 📝 Variable processing and templating
- 🔧 Customizable hooks system
- 🔒 Isolated VM variable evaluation
- 💾 State tracking with lock files
- ⚡ Bash command output integration
- 🔑 Base64, random value and command output support
- 🔍 JSON query support

## Installation

### Global Installation

```bash
npm install -g feasible
# or
yarn global add feasible
```

### Project Installation

```bash
npm install feasible --save-dev
# or
yarn add feasible --dev
```

You can also use it directly without installation:

```bash
npx feasible
```

## Usage

### Quick Start

1. Add Feasible to your project:
   ```bash
   npm install feasible --save-dev
   ```

2. Add a script to your package.json:
   ```json
   {
     "scripts": {
       "env": "feasible"
     }
   }
   ```

3. Create a configuration file (feasible.yml, feasible.json, or feasible.json5)

4. Set up Git hooks for automation (using husky as an example):
   ```bash
   # Run on merge
   npx husky add .husky/post-merge "npm run env"

   # Run on checkout
   npx husky add .husky/post-checkout "npm run env"
   ```

## Life Cycle

1. Download config file from remote (if `--url` option is used)
2. Prompt questions
3. Resolve default variables
4. Execute initial hooks (first setup/no lock file)
5. Execute pre-hooks
6. Clean up earlier produced files
7. Render and save files
8. Execute post-hooks
9. Update lock file state

## Command Line Options

```bash
Usage: feasible [options]

Options:
  -V, --version                output the version number
  -c, --config <FilePath>      Configuration file (default: "feasible.{json,json5,yml,yaml}")
  -u, --url <FileUrl>         Configuration file URL
  -f, --force                 Overwrite current setup and start over (default: false)
  -o, --overwrite <Variable>  Overwrite specific variables. This option can be used multiple times
  -a, --actions <Action>      Choose desired actions to execute (choices: "none", "initial", "pre", "post", "all", default: "all")
  -n, --noClean              Prevent cleaning up old output files (default: false)
  -i, --noInteraction        Execute in non-interactive mode. Lock file must exist (default: false)
  -q, --quiet                Execute in silent mode (default: false)
  -s, --separator <Separator> Specify the default separator for variables and values (default: "=")
  -h, --help                  display help for command
```

### Examples

```bash
# Use a custom config file
feasible -c custom.json

# Use a remote config file
feasible -u https://example.com/config.yml

# Force reset environment
feasible --force

# Run specific actions only
feasible -a pre

# Overwrite specific variables
feasible -o "DB_HOST=localhost" -o "PORT=3000"

# Non-interactive mode
feasible --noInteraction

# Silent execution
feasible --quiet
```

## Variable Processing Features

- Base64 encoding support (`type: "base64"`)
- Random value generation (`type: "random"` or `initial: "random()"`)
- Bash command output parsing
- JSON output parsing with query support
- Isolated VM variable evaluation

## File Processing Features

- JSON, YAML and ENV file format support
- Conditional file content generation
- Automatic cleanup of previously generated files
- Checksum validation for file integrity

## Lock File Management

- Automatic state tracking
- Variable and file list backup
- Automatic recovery on failure
- Version controlled configuration

## Requirements

- Node.js >= 20

## License

[MIT](LICENSE)

[node-version-image]: https://img.shields.io/node/v/feasible
[node-version-url]: https://nodejs.org/en/download/
[npm-image]: https://img.shields.io/npm/v/feasible.svg
[npm-url]: https://npmjs.org/package/feasible
[license-image]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: LICENSE