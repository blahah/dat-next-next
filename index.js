#!/usr/bin/env node

process.title = 'dat-next-next'

var discovery = require('hyperdiscovery')
var hyperdrive = require('hyperdrive')
var mirror = require('mirror-folder')
var minimist = require('minimist')

var argv = minimist(process.argv.slice(2))

var key = argv._[0]

if (key) download(new Buffer(key, 'hex'))
else upload()

function download (key) {
  var archive = hyperdrive('.dat', key)

  archive.on('ready', function () {
    console.log('Syncing to', process.cwd())
    console.log('Key is: ' + archive.key.toString('hex'))

    if (archive.metadata.length) {
      copy()
    } else {
      console.log('Waiting for update ...')
      archive.metadata.once('append', copy)
    }

    discovery(archive, {live: true, utp: !!argv.utp})

    function copy () {
      var length = archive.metadata.length
      var progress = mirror({name: '/', fs: archive}, process.cwd())
      var changed = false

      progress.on('put', function (src) {
        changed = true
        console.log('Downloading file', src.name)
      })

      progress.on('del', function (src) {
        changed = true
        console.log('Removing file', src.name)
      })

      progress.on('end', function () {
        if (!changed) {
          console.log('Waiting for update ...')
          if (length !== archive.metadata.length) copy()
          else archive.metadata.once('append', copy)
          return
        }
        console.log('Done! Bye.')
        process.exit(0)
      })
    }
  })
}

function upload () {
  var archive = hyperdrive('.dat')

  archive.on('ready', function () {
    console.log('Sharing', process.cwd())
    console.log('Key is: ' + archive.key.toString('hex'))

    discovery(archive, {live: true, utp: !!argv.utp})

    var progress = mirror(process.cwd(), {name: '/', fs: archive}, {ignore: ignore, live: true, dereference: true})

    progress.on('put', function (src) {
      console.log('Adding file', src.name)
    })

    progress.on('del', function (src) {
      console.log('Removing file', src.name)
    })
  })
}

function ignore (name, st) {
  if (st && st.isDirectory()) return true // ignore dirs
  if (name.indexOf('.DS_Store') > -1) return true
  if (name.indexOf('.dat') > -1) return true
  return false
}
