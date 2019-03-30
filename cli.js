#!/usr/bin/env node

const fs = require('fs')
const RawGCodeSender = require('./lib/RawGCodeSender')

const parseFileName = name => fs.createReadStream(name)

const program = require('commander')
  .version('0.1.0')
  .option('-p, --port <serial-port>', 'Serial port to send the GCode to (required)')
  .option('-b, --baud <baudrate>', 'Serial port baudrate', 115200)
  .option('-i, --input <filename>', 'File to read the GCode from (default: standard input)', parseFileName)
  .option('--queue-size <size>', 'Queue size', 10)
  .parse(process.argv)

if (program.port === undefined) {
  console.error('error: no serial port specified')
  process.exit(1)
}

if (program.input === undefined) {
  program.input = process.stdin
}

const sender = new RawGCodeSender(program.port, program.baud, program.input, program.queueSize)
sender.on('error', err => {
  console.error('error: ', err)
  process.exit(2)
})
sender.on('input', line => console.log('>', line))
sender.on('serial', data => console.log('<', data))
sender.on('end', () => sender.close())

process.on('SIGINT', function() {
  console.log('interrupt - stopping serial and disabling tool');
  Promise.resolve(0)
    .then(() => sender.pause())
    .then(() => sender.sendLineToSerial('M107'))
    .then(() => sender.sendLineToSerial('M5'))
    .then(() => sender.close())
    .then(() => process.exit())
    .catch(() => process.exit())
});
