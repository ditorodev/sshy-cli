import chalk from "chalk";
import path from "path";
import fs from "fs";
import {exec} from "child_process";
import {program} from "commander";

const SSHY_FILE_NAME = 'id_rsa'
const SSHY_FOLDER = '.sshy'
const SSH_CONFIG_PATH = path.resolve(path.join(process.env.HOME as string, '.ssh', 'config'));

program
  .command('setup')
  .description('Setup ssh keys and config')
  .action(async () => {
    try {
      await addSshyToGitIgnore();
      await generateSSHKey();
      await retrieveSSHKey();
      await addToSSHConfig();
      console.log(chalk.green('Setup completed successfully!'));
    } catch (error) {
      console.error(chalk.red('An error occur red during setup:'), error);
    }
  });



program.parse();

// await generateSSHKey();
// await retrieveSSHKey();

async function addSshyToGitIgnore() {
  const gitIgnoreFile = Bun.file('./.gitignore');
  if (await gitIgnoreFile.exists()) {
    const content = await gitIgnoreFile.text();
    if (!content.includes(SSHY_FOLDER)) {
      fs.appendFile('./.gitignore', `\n${SSHY_FOLDER}\n`, (err) => {
        if (err) throw err;
        console.log('✅ .gitignore has been updated!');
      });
    }
  } else {
    fs.writeFile('./.gitignore', `${SSHY_FOLDER}\n`, (err) => {
      if (err) throw err;
      console.log('✅ .gitignore has been created!');
    });
  }
}

async function checkIdentityFile(root: string) {
  const route = path.join(`${root}`, SSHY_FOLDER, SSHY_FILE_NAME);
  return await Bun.file(route).exists() && route;
}

async function getOrMakeSshConfig() {
  const file = Bun.file(SSH_CONFIG_PATH)
  if (!(await file.exists())) {
    fs.mkdirSync(path.dirname(SSH_CONFIG_PATH), { recursive: true });
    const writer = file.writer();
    writer.start();
    writer.end();
    fs.chmodSync(SSH_CONFIG_PATH, '600');
    return SSH_CONFIG_PATH;
  }
}


async function addToSSHConfig() {
  const identityFile = await checkIdentityFile(process.cwd());
  let hostname_response = await prompt('Please enter the hostname (format: user@hostname):');
  while(!hostname_response) {
    console.log(chalk.yellow('Hostname is required. Please provide a value.'));
    hostname_response = await prompt('Please enter the hostname (format: user@hostname):');
  }

  const [user, hostname] = hostname_response.split("@");

  const sshConfig = `Host ${hostname}
    User ${user}
    Hostname ${hostname}
    PreferredAuthentications publickey
    IdentityFile ${identityFile}
    \n\n
    `;

    await getOrMakeSshConfig();
    fs.appendFile(SSH_CONFIG_PATH, sshConfig, (err) => {
      if (err) throw err;
      console.log('✅ SSH Config has been updated!');
    });
}
async function generateSSHKey() {
  return new Promise((resolve, reject) => exec('mkdir ./.sshy && ssh-keygen -t rsa -b 4096 -f ./.sshy/id_rsa -q -N ""', (error, stdout, stderr) => {
    if (error) {
      console.error(chalk.red(`❌ exec error: ${error}`));
      return reject();
    }
    if(stderr){
      console.error(chalk.yellow(`⚠️ stderr: ${stderr}`));
      return reject();
    }
    
    console.log(`${chalk.green(`✅ File created at`)} ${chalk.whiteBright(process.cwd() + '/.sshy/id_rsa')}`);
    return resolve(null);
  }));
}

async function retrieveSSHKey() {
  const sshKeyFile = Bun.file('./.sshy/id_rsa.pub');
  if (await sshKeyFile.exists()) {
    const content = await sshKeyFile.text();
    console.log(chalk.green('===================================='));
    console.log(chalk.green('SSH Key:'));
    console.log(chalk.yellow(content));
    console.log(chalk.green('===================================='));
  } else {
    console.error(chalk.red('SSH Key file does not exist'));
  }
}




