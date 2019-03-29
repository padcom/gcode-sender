#!/usr/bin/env node

const fs = require('fs')
const SerialPort = require('serialport')
const LineByLineReader = require('line-by-line')

const parseFileName = name => fs.createReadStram(name)

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

var serial = new SerialPort(program.port, program.baud)
const parser = serial.pipe(new SerialPort.parsers.Readline('\n'))
const input = new LineByLineReader(program.input)

const errorHandler = err => {
  console.err('error:', err)
}

serial.on('error', errorHandler)
input.on('error', errorHandler)

let queue = 0
let shouldEnd = false

parser.on('data', function(data) {
  console.log('<', data);
  if (data === 'ok') {
    queue--
    if (queue == 0 && shouldEnd) {
      serial.close()
    } else {
      input.resume()
    }
  }
});

function filterCommentFromInput(input) {
  const commentStart = input.indexOf(';')
  return commentStart > -1 ? input.slice(0, commentStart) : input
}

input.on('line', line => {
  line = filterCommentFromInput(line)
  if (line.length > 0) {
    console.log('>', line)
    serial.write(line + '\n')
    queue++
    if (queue > program.queueSize) {
      input.pause()
    }
  }
})

input.on('end', () => {
  shouldEnd = true
})
