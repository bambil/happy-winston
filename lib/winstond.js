/*
 * +===============================================
 * | Author:        Parham Alvani <parham.alvani@gmail.com>
 * |
 * | Creation Date: 24-08-2017
 * |
 * | File Name:     lib/winstond.js
 * +===============================================
 */
const winston = require('winston')
const hapi = require('hapi')
const boom = require('boom')
const joi = require('joi')

class Winstond extends winston.Logger {
  constructor (options) {
    super(options)

    if (!options) {
      options = {}
    }
    this.methods = options.methods || ['collect', 'query']

    this.server = new hapi.Server()
    this.server.connection({
      port: options.port || 9003,
      host: options.host || '127.0.0.1'
    })
    // Registers socket.io hapi plugin
    this.server.register({
      register: require('hapi-io'),
      options: {}
    })
    // Registers handling route
    this.server.route({
      method: 'POST',
      path: '/',
      config: {
        payload: {
          parse: true
        }
      },
      handler: (request, reply) => {
        joi.validate(request.payload, joi.object().keys({
          method: joi.string().required(),
          params: joi.object()
        }))
        const io = request.plugins['hapi-io'].io

        if (request.payload.method === 'collect' && this.methods.indexOf('collect') > -1) {
          let log = request.payload.params
          // Collects log with winston
          this.log(log.level, log.message, log.meta, (err) => {
            if (err) {
              return reply(err).code(500)
            } else {
              io.emit('log', log)
              return reply({
                ok: true
              })
            }
          })
        } else if (request.payload.method === 'query' && this.methods.indexOf('query') > -1) {
          let options = request.payload.params
          // Queries Log by winston
          this.query(options, (err, results) => {
            if (err) {
              return reply(err)
            } else {
              return reply(results)
            }
          })
        } else {
          return reply(boom.badRequest({
            message: 'Bad Request'
          }))
        }
      }
    })
  }

  listen () {
    this.server.start((err) => {
      if (err) {
        throw err
      }

      this.emit('listening')
    })
  }
}

module.exports = Winstond
