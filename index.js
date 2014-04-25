var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var includePathSearcher = require('include-path-searcher')
var quickTemp = require('quick-temp')
var mapSeries = require('promise-map-series')
var stylus = require('stylus')
var _ = require('lodash')
var RSVP = require('rsvp');

module.exports = StylusCompiler
function StylusCompiler (sourceTrees, inputFile, outputFile, options) {
  if (!(this instanceof StylusCompiler)) return new StylusCompiler(sourceTrees, inputFile, outputFile, options)
  this.sourceTrees = sourceTrees
  this.inputFile = inputFile
  this.outputFile = outputFile
  this.stylusOptions = options || {}
}

StylusCompiler.prototype.read = function (readTree) {
  var self = this
  quickTemp.makeOrRemake(this, '_tmpDestDir')
  var destFile = this._tmpDestDir + '/' + this.outputFile
  mkdirp.sync(path.dirname(destFile))
  return mapSeries(this.sourceTrees, readTree)
    .then(function (includePaths) {
      var stylusOptions = {
        filename: includePathSearcher.findFileSync(self.inputFile, includePaths),
        paths: includePaths,
        use: []
      }

      _.merge(stylusOptions, self.stylusOptions)
      stylusOptions.paths = [path.dirname(stylusOptions.filename)].concat(stylusOptions.paths);
      data = fs.readFileSync(stylusOptions.filename, 'utf8');

      var style = stylus(data);
      style.set('filename', stylusOptions.filename).set('paths', stylusOptions.paths);

      if (stylusOptions.use instanceof Array && stylusOptions.use.length > 0) {
        var l = stylusOptions.use.length;
        for (var i = 0; i < l; i++) {
          style.use(stylusOptions.use[i]);
        }
      }

      var promise = new RSVP.Promise(function(resolve, reject) {
        style.render(function (e, css) {
          if (e) {
            reject(e);
          }
          fs.writeFileSync(destFile, css, { encoding: 'utf8' });

          resolve(self._tmpDestDir);
        });
      });

      return promise;
    });
}

StylusCompiler.prototype.cleanup = function () {
  quickTemp.remove(this, '_tmpDestDir')
}

