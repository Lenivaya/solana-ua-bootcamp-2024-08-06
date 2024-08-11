import { Keypair } from '@solana/web3.js'
import chalk from 'chalk'
import fs from 'fs/promises'

async function main() {
  const keypair = Keypair.generate()

  const publicKey = keypair.publicKey.toBase58()
  const secretKey = keypair.secretKey

  console.log(chalk.yellow('Public key:'), chalk.blue(publicKey))
  console.log(chalk.yellow('Private key:'), secretKey)

  const envFileContent = `SECRET_KEY="[${secretKey.toString()}]"`

  try {
    await fs.writeFile('.env', envFileContent, 'utf8')
    console.log(chalk.yellow('.env file has been written with the secret key.'))
  } catch (error) {
    console.error('Error writing to .env file:', error)
  }
}

main()
  .then(() =>
    console.log(chalk.bold.green('Keypair generated and written to .env file.'))
  )
  .catch((err) =>
    console.error(chalk.bold.red('Error generating keypair:', err))
  )
