# Feasible

Guided and unified development environments setup wizard.

## Life Cycle
1. Download config file from remote if `--url` option is used
2. Prompt questions
3. Resolve default variables
4. Initial hooks executed (if this is first setup/no lock file)
5. Pre hooks executed
6. Clone remote repository (if `repository` defined in config file)
7. Clean up earlier produced files
8. Render and save files
9. Post hooks executed

## Getting Started
### 1. Automate
Let's start by installing Feasible as a dev dependency of your project
`npm install feasible --save-dev` or `yarn add feasible --dev` 
and add a script to your package.json, e.g.: `"env": "feasible"` just to trigger feasible.
_Or you can skip installation section and use `npx feasible` directly on your hooks_

After that we need to create a configuration file in format you prefer _feasible.{yml,json,json5}_

Last step we have to create a git hook to automate updating environment on pull or checkouts (your choice, example is using husky, but you can use any other hook system)
`npx husky add .husky/post-merge "npm run env"` or 
`npx husky add .husky/post-checkout "npm run env"` or both.

  
### 2. Manually managing
Install as a global and use on any project that have _feasible.{yml,json,json5}_ configuration file
`npm install -g feasible` or `npx feasible`

## Commands & Arguments

- Using different config file other than _feasible.{yml,json,json5}_ `feasible -c custom.json`

```bash
Usage: feasible <command> [options]

Start setup process

Options:
  -V, --version                output the version number
  -c, --config <FilePath>      Configuration file (default: "feasible.{json,json5,yml}")
  -u, --url <FileUrl>          Configuration file url. Example: https://my-private-repo.git.com/raw/dope-repository/main/feasible.{json,json5,yml}?token=TOKEN
  -f, --force                  Overwrite current setup if it exists and start over (default: false)
  -p, --parallel               Enable parallel actions if possible (default: false)
  -s, --separator <Separator>  Default separator for variable and values (default: "=")
  -n, --no-clean               Don't clean up old output files
  -h, --help                   display help for command

```
- Fetch remote config and execute `npx feasible -c https://remote-url.io/feasible.yml`
- Version `feasible --version`
- Help `feasible --help`

## Configuration
