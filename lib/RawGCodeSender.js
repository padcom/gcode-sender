const events = require('events')
const SerialPort = require('serialport')
const LineByLineReader = require('line-by-line')

module.exports = class RawGCodeSender extends events.EventEmitter {
  constructor (port, baud, input, queueSize = 10) {
    super()

    this.queue = 0
    this.shouldEnd = false
    
    this.serial = new SerialPort(port, baud)
    this.parser = this.serial.pipe(new SerialPort.parsers.Readline('\n'))
    this.input = new LineByLineReader(input)

    this.serial.on('error', this.errorHandler.bind(this))
    this.parser.on('data', this.processSerialResponse.bind(this))
    this.input.on('line', this.sendLineToSerial.bind(this))
    this.input.on('error', this.errorHandler.bind(this))
    this.input.on('end', () => this.shouldEnd = true)
  }

  pause () {
    input.pause()
  }

  resume () {
    input.resume()
  }

  close () {
    this.serial.close()
    this.input.close()
  }

  errorHandler (err) {
    this.emit('error', err)
  }

  processSerialResponse (data) {
    this.emit('serial', data)
    if (data === 'ok') {
      this.queue--
      if (this.queue == 0 && this.shouldEnd) {
        this.emit('end')
      } else {
        this.input.resume()
      }
    }
  }

  filterCommentFromInput (input) {
    const commentStart = input.indexOf(';')
    return commentStart > -1 ? input.slice(0, commentStart) : input
  }
  
  sendLineToSerial (line) {
    return new Promise((resolve, reject) => {
      line = this.filterCommentFromInput(line)
      if (line.length > 0) {
        this.emit('input', line)
        this.serial.write(line + '\n', (err, bytesWritten) => {
          if (err) reject(err)
          else resolve(bytesWritten)
        })
        this.queue++
        if (this.queue > this.queueSize) {
          this.input.pause()
        }
      }
    })
  }
}
