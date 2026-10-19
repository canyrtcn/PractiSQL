"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// artifacts/siwc-devkit/node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "artifacts/siwc-devkit/node_modules/graceful-fs/polyfills.js"(exports2, module2) {
    var constants2 = require("constants");
    var origCwd = process.cwd;
    var cwd = null;
    var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
    process.cwd = function() {
      if (!cwd)
        cwd = origCwd.call(process);
      return cwd;
    };
    try {
      process.cwd();
    } catch (er) {
    }
    if (typeof process.chdir === "function") {
      chdir = process.chdir;
      process.chdir = function(d) {
        cwd = null;
        chdir.call(process, d);
      };
      if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
    }
    var chdir;
    module2.exports = patch;
    function patch(fs) {
      if (constants2.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs);
      }
      if (!fs.lutimes) {
        patchLutimes(fs);
      }
      fs.chown = chownFix(fs.chown);
      fs.fchown = chownFix(fs.fchown);
      fs.lchown = chownFix(fs.lchown);
      fs.chmod = chmodFix(fs.chmod);
      fs.fchmod = chmodFix(fs.fchmod);
      fs.lchmod = chmodFix(fs.lchmod);
      fs.chownSync = chownFixSync(fs.chownSync);
      fs.fchownSync = chownFixSync(fs.fchownSync);
      fs.lchownSync = chownFixSync(fs.lchownSync);
      fs.chmodSync = chmodFixSync(fs.chmodSync);
      fs.fchmodSync = chmodFixSync(fs.fchmodSync);
      fs.lchmodSync = chmodFixSync(fs.lchmodSync);
      fs.stat = statFix(fs.stat);
      fs.fstat = statFix(fs.fstat);
      fs.lstat = statFix(fs.lstat);
      fs.statSync = statFixSync(fs.statSync);
      fs.fstatSync = statFixSync(fs.fstatSync);
      fs.lstatSync = statFixSync(fs.lstatSync);
      if (fs.chmod && !fs.lchmod) {
        fs.lchmod = function(path, mode, cb) {
          if (cb) process.nextTick(cb);
        };
        fs.lchmodSync = function() {
        };
      }
      if (fs.chown && !fs.lchown) {
        fs.lchown = function(path, uid, gid, cb) {
          if (cb) process.nextTick(cb);
        };
        fs.lchownSync = function() {
        };
      }
      if (platform === "win32") {
        fs.rename = typeof fs.rename !== "function" ? fs.rename : (function(fs$rename) {
          function rename2(from, to, cb) {
            var start = Date.now();
            var backoff = 0;
            fs$rename(from, to, function CB(er) {
              if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
                setTimeout(function() {
                  fs.stat(to, function(stater, st) {
                    if (stater && stater.code === "ENOENT")
                      fs$rename(from, to, CB);
                    else
                      cb(er);
                  });
                }, backoff);
                if (backoff < 100)
                  backoff += 10;
                return;
              }
              if (cb) cb(er);
            });
          }
          if (Object.setPrototypeOf) Object.setPrototypeOf(rename2, fs$rename);
          return rename2;
        })(fs.rename);
      }
      fs.read = typeof fs.read !== "function" ? fs.read : (function(fs$read) {
        function read(fd, buffer, offset, length, position, callback_) {
          var callback;
          if (callback_ && typeof callback_ === "function") {
            var eagCounter = 0;
            callback = function(er, _, __) {
              if (er && er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                return fs$read.call(fs, fd, buffer, offset, length, position, callback);
              }
              callback_.apply(this, arguments);
            };
          }
          return fs$read.call(fs, fd, buffer, offset, length, position, callback);
        }
        if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
        return read;
      })(fs.read);
      fs.readSync = typeof fs.readSync !== "function" ? fs.readSync : /* @__PURE__ */ (function(fs$readSync) {
        return function(fd, buffer, offset, length, position) {
          var eagCounter = 0;
          while (true) {
            try {
              return fs$readSync.call(fs, fd, buffer, offset, length, position);
            } catch (er) {
              if (er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                continue;
              }
              throw er;
            }
          }
        };
      })(fs.readSync);
      function patchLchmod(fs2) {
        fs2.lchmod = function(path, mode, callback) {
          fs2.open(
            path,
            constants2.O_WRONLY | constants2.O_SYMLINK,
            mode,
            function(err, fd) {
              if (err) {
                if (callback) callback(err);
                return;
              }
              fs2.fchmod(fd, mode, function(err2) {
                fs2.close(fd, function(err22) {
                  if (callback) callback(err2 || err22);
                });
              });
            }
          );
        };
        fs2.lchmodSync = function(path, mode) {
          var fd = fs2.openSync(path, constants2.O_WRONLY | constants2.O_SYMLINK, mode);
          var threw = true;
          var ret;
          try {
            ret = fs2.fchmodSync(fd, mode);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs2.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs2.closeSync(fd);
            }
          }
          return ret;
        };
      }
      function patchLutimes(fs2) {
        if (constants2.hasOwnProperty("O_SYMLINK") && fs2.futimes) {
          fs2.lutimes = function(path, at, mt, cb) {
            fs2.open(path, constants2.O_SYMLINK, function(er, fd) {
              if (er) {
                if (cb) cb(er);
                return;
              }
              fs2.futimes(fd, at, mt, function(er2) {
                fs2.close(fd, function(er22) {
                  if (cb) cb(er2 || er22);
                });
              });
            });
          };
          fs2.lutimesSync = function(path, at, mt) {
            var fd = fs2.openSync(path, constants2.O_SYMLINK);
            var ret;
            var threw = true;
            try {
              ret = fs2.futimesSync(fd, at, mt);
              threw = false;
            } finally {
              if (threw) {
                try {
                  fs2.closeSync(fd);
                } catch (er) {
                }
              } else {
                fs2.closeSync(fd);
              }
            }
            return ret;
          };
        } else if (fs2.futimes) {
          fs2.lutimes = function(_a, _b, _c, cb) {
            if (cb) process.nextTick(cb);
          };
          fs2.lutimesSync = function() {
          };
        }
      }
      function chmodFix(orig) {
        if (!orig) return orig;
        return function(target, mode, cb) {
          return orig.call(fs, target, mode, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chmodFixSync(orig) {
        if (!orig) return orig;
        return function(target, mode) {
          try {
            return orig.call(fs, target, mode);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function chownFix(orig) {
        if (!orig) return orig;
        return function(target, uid, gid, cb) {
          return orig.call(fs, target, uid, gid, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chownFixSync(orig) {
        if (!orig) return orig;
        return function(target, uid, gid) {
          try {
            return orig.call(fs, target, uid, gid);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function statFix(orig) {
        if (!orig) return orig;
        return function(target, options, cb) {
          if (typeof options === "function") {
            cb = options;
            options = null;
          }
          function callback(er, stats) {
            if (stats) {
              if (stats.uid < 0) stats.uid += 4294967296;
              if (stats.gid < 0) stats.gid += 4294967296;
            }
            if (cb) cb.apply(this, arguments);
          }
          return options ? orig.call(fs, target, options, callback) : orig.call(fs, target, callback);
        };
      }
      function statFixSync(orig) {
        if (!orig) return orig;
        return function(target, options) {
          var stats = options ? orig.call(fs, target, options) : orig.call(fs, target);
          if (stats) {
            if (stats.uid < 0) stats.uid += 4294967296;
            if (stats.gid < 0) stats.gid += 4294967296;
          }
          return stats;
        };
      }
      function chownErOk(er) {
        if (!er)
          return true;
        if (er.code === "ENOSYS")
          return true;
        var nonroot = !process.getuid || process.getuid() !== 0;
        if (nonroot) {
          if (er.code === "EINVAL" || er.code === "EPERM")
            return true;
        }
        return false;
      }
    }
  }
});

// artifacts/siwc-devkit/node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS({
  "artifacts/siwc-devkit/node_modules/graceful-fs/legacy-streams.js"(exports2, module2) {
    var Stream = require("stream").Stream;
    module2.exports = legacy;
    function legacy(fs) {
      return {
        ReadStream,
        WriteStream
      };
      function ReadStream(path, options) {
        if (!(this instanceof ReadStream)) return new ReadStream(path, options);
        Stream.call(this);
        var self = this;
        this.path = path;
        this.fd = null;
        this.readable = true;
        this.paused = false;
        this.flags = "r";
        this.mode = 438;
        this.bufferSize = 64 * 1024;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.encoding) this.setEncoding(this.encoding);
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.end === void 0) {
            this.end = Infinity;
          } else if ("number" !== typeof this.end) {
            throw TypeError("end must be a Number");
          }
          if (this.start > this.end) {
            throw new Error("start must be <= end");
          }
          this.pos = this.start;
        }
        if (this.fd !== null) {
          process.nextTick(function() {
            self._read();
          });
          return;
        }
        fs.open(this.path, this.flags, this.mode, function(err, fd) {
          if (err) {
            self.emit("error", err);
            self.readable = false;
            return;
          }
          self.fd = fd;
          self.emit("open", fd);
          self._read();
        });
      }
      function WriteStream(path, options) {
        if (!(this instanceof WriteStream)) return new WriteStream(path, options);
        Stream.call(this);
        this.path = path;
        this.fd = null;
        this.writable = true;
        this.flags = "w";
        this.encoding = "binary";
        this.mode = 438;
        this.bytesWritten = 0;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.start < 0) {
            throw new Error("start must be >= zero");
          }
          this.pos = this.start;
        }
        this.busy = false;
        this._queue = [];
        if (this.fd === null) {
          this._open = fs.open;
          this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
          this.flush();
        }
      }
    }
  }
});

// artifacts/siwc-devkit/node_modules/graceful-fs/clone.js
var require_clone = __commonJS({
  "artifacts/siwc-devkit/node_modules/graceful-fs/clone.js"(exports2, module2) {
    "use strict";
    module2.exports = clone;
    var getPrototypeOf = Object.getPrototypeOf || function(obj) {
      return obj.__proto__;
    };
    function clone(obj) {
      if (obj === null || typeof obj !== "object")
        return obj;
      if (obj instanceof Object)
        var copy = { __proto__: getPrototypeOf(obj) };
      else
        var copy = /* @__PURE__ */ Object.create(null);
      Object.getOwnPropertyNames(obj).forEach(function(key) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
      });
      return copy;
    }
  }
});

// artifacts/siwc-devkit/node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS({
  "artifacts/siwc-devkit/node_modules/graceful-fs/graceful-fs.js"(exports2, module2) {
    var fs = require("fs");
    var polyfills = require_polyfills();
    var legacy = require_legacy_streams();
    var clone = require_clone();
    var util = require("util");
    var gracefulQueue;
    var previousSymbol;
    if (typeof Symbol === "function" && typeof Symbol.for === "function") {
      gracefulQueue = /* @__PURE__ */ Symbol.for("graceful-fs.queue");
      previousSymbol = /* @__PURE__ */ Symbol.for("graceful-fs.previous");
    } else {
      gracefulQueue = "___graceful-fs.queue";
      previousSymbol = "___graceful-fs.previous";
    }
    function noop() {
    }
    function publishQueue(context, queue2) {
      Object.defineProperty(context, gracefulQueue, {
        get: function() {
          return queue2;
        }
      });
    }
    var debug = noop;
    if (util.debuglog)
      debug = util.debuglog("gfs4");
    else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
      debug = function() {
        var m = util.format.apply(util, arguments);
        m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
        console.error(m);
      };
    if (!fs[gracefulQueue]) {
      queue = global[gracefulQueue] || [];
      publishQueue(fs, queue);
      fs.close = (function(fs$close) {
        function close(fd, cb) {
          return fs$close.call(fs, fd, function(err) {
            if (!err) {
              resetQueue();
            }
            if (typeof cb === "function")
              cb.apply(this, arguments);
          });
        }
        Object.defineProperty(close, previousSymbol, {
          value: fs$close
        });
        return close;
      })(fs.close);
      fs.closeSync = (function(fs$closeSync) {
        function closeSync(fd) {
          fs$closeSync.apply(fs, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync;
      })(fs.closeSync);
      if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
        process.on("exit", function() {
          debug(fs[gracefulQueue]);
          require("assert").equal(fs[gracefulQueue].length, 0);
        });
      }
    }
    var queue;
    if (!global[gracefulQueue]) {
      publishQueue(global, fs[gracefulQueue]);
    }
    module2.exports = patch(clone(fs));
    if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
      module2.exports = patch(fs);
      fs.__patched = true;
    }
    function patch(fs2) {
      polyfills(fs2);
      fs2.gracefulify = patch;
      fs2.createReadStream = createReadStream;
      fs2.createWriteStream = createWriteStream;
      var fs$readFile = fs2.readFile;
      fs2.readFile = readFile;
      function readFile(path, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$readFile(path, options, cb);
        function go$readFile(path2, options2, cb2, startTime) {
          return fs$readFile(path2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$readFile, [path2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$writeFile = fs2.writeFile;
      fs2.writeFile = writeFile;
      function writeFile(path, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$writeFile(path, data, options, cb);
        function go$writeFile(path2, data2, options2, cb2, startTime) {
          return fs$writeFile(path2, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$writeFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$appendFile = fs2.appendFile;
      if (fs$appendFile)
        fs2.appendFile = appendFile;
      function appendFile(path, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$appendFile(path, data, options, cb);
        function go$appendFile(path2, data2, options2, cb2, startTime) {
          return fs$appendFile(path2, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$appendFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$copyFile = fs2.copyFile;
      if (fs$copyFile)
        fs2.copyFile = copyFile;
      function copyFile(src, dest, flags, cb) {
        if (typeof flags === "function") {
          cb = flags;
          flags = 0;
        }
        return go$copyFile(src, dest, flags, cb);
        function go$copyFile(src2, dest2, flags2, cb2, startTime) {
          return fs$copyFile(src2, dest2, flags2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$readdir = fs2.readdir;
      fs2.readdir = readdir;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir(path, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path2, options2, cb2, startTime) {
          return fs$readdir(path2, fs$readdirCallback(
            path2,
            options2,
            cb2,
            startTime
          ));
        } : function go$readdir2(path2, options2, cb2, startTime) {
          return fs$readdir(path2, options2, fs$readdirCallback(
            path2,
            options2,
            cb2,
            startTime
          ));
        };
        return go$readdir(path, options, cb);
        function fs$readdirCallback(path2, options2, cb2, startTime) {
          return function(err, files) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([
                go$readdir,
                [path2, options2, cb2],
                err,
                startTime || Date.now(),
                Date.now()
              ]);
            else {
              if (files && files.sort)
                files.sort();
              if (typeof cb2 === "function")
                cb2.call(this, err, files);
            }
          };
        }
      }
      if (process.version.substr(0, 4) === "v0.8") {
        var legStreams = legacy(fs2);
        ReadStream = legStreams.ReadStream;
        WriteStream = legStreams.WriteStream;
      }
      var fs$ReadStream = fs2.ReadStream;
      if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = ReadStream$open;
      }
      var fs$WriteStream = fs2.WriteStream;
      if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = WriteStream$open;
      }
      Object.defineProperty(fs2, "ReadStream", {
        get: function() {
          return ReadStream;
        },
        set: function(val) {
          ReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(fs2, "WriteStream", {
        get: function() {
          return WriteStream;
        },
        set: function(val) {
          WriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileReadStream = ReadStream;
      Object.defineProperty(fs2, "FileReadStream", {
        get: function() {
          return FileReadStream;
        },
        set: function(val) {
          FileReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileWriteStream = WriteStream;
      Object.defineProperty(fs2, "FileWriteStream", {
        get: function() {
          return FileWriteStream;
        },
        set: function(val) {
          FileWriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      function ReadStream(path, options) {
        if (this instanceof ReadStream)
          return fs$ReadStream.apply(this, arguments), this;
        else
          return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
      }
      function ReadStream$open() {
        var that = this;
        open2(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            if (that.autoClose)
              that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
            that.read();
          }
        });
      }
      function WriteStream(path, options) {
        if (this instanceof WriteStream)
          return fs$WriteStream.apply(this, arguments), this;
        else
          return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
      }
      function WriteStream$open() {
        var that = this;
        open2(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
          }
        });
      }
      function createReadStream(path, options) {
        return new fs2.ReadStream(path, options);
      }
      function createWriteStream(path, options) {
        return new fs2.WriteStream(path, options);
      }
      var fs$open = fs2.open;
      fs2.open = open2;
      function open2(path, flags, mode, cb) {
        if (typeof mode === "function")
          cb = mode, mode = null;
        return go$open(path, flags, mode, cb);
        function go$open(path2, flags2, mode2, cb2, startTime) {
          return fs$open(path2, flags2, mode2, function(err, fd) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$open, [path2, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      return fs2;
    }
    function enqueue(elem) {
      debug("ENQUEUE", elem[0].name, elem[1]);
      fs[gracefulQueue].push(elem);
      retry();
    }
    var retryTimer;
    function resetQueue() {
      var now = Date.now();
      for (var i = 0; i < fs[gracefulQueue].length; ++i) {
        if (fs[gracefulQueue][i].length > 2) {
          fs[gracefulQueue][i][3] = now;
          fs[gracefulQueue][i][4] = now;
        }
      }
      retry();
    }
    function retry() {
      clearTimeout(retryTimer);
      retryTimer = void 0;
      if (fs[gracefulQueue].length === 0)
        return;
      var elem = fs[gracefulQueue].shift();
      var fn = elem[0];
      var args = elem[1];
      var err = elem[2];
      var startTime = elem[3];
      var lastTime = elem[4];
      if (startTime === void 0) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args);
      } else if (Date.now() - startTime >= 6e4) {
        debug("TIMEOUT", fn.name, args);
        var cb = args.pop();
        if (typeof cb === "function")
          cb.call(null, err);
      } else {
        var sinceAttempt = Date.now() - lastTime;
        var sinceStart = Math.max(lastTime - startTime, 1);
        var desiredDelay = Math.min(sinceStart * 1.2, 100);
        if (sinceAttempt >= desiredDelay) {
          debug("RETRY", fn.name, args);
          fn.apply(null, args.concat([startTime]));
        } else {
          fs[gracefulQueue].push(elem);
        }
      }
      if (retryTimer === void 0) {
        retryTimer = setTimeout(retry, 0);
      }
    }
  }
});

// artifacts/siwc-devkit/node_modules/retry/lib/retry_operation.js
var require_retry_operation = __commonJS({
  "artifacts/siwc-devkit/node_modules/retry/lib/retry_operation.js"(exports2, module2) {
    function RetryOperation(timeouts, options) {
      if (typeof options === "boolean") {
        options = { forever: options };
      }
      this._originalTimeouts = JSON.parse(JSON.stringify(timeouts));
      this._timeouts = timeouts;
      this._options = options || {};
      this._maxRetryTime = options && options.maxRetryTime || Infinity;
      this._fn = null;
      this._errors = [];
      this._attempts = 1;
      this._operationTimeout = null;
      this._operationTimeoutCb = null;
      this._timeout = null;
      this._operationStart = null;
      if (this._options.forever) {
        this._cachedTimeouts = this._timeouts.slice(0);
      }
    }
    module2.exports = RetryOperation;
    RetryOperation.prototype.reset = function() {
      this._attempts = 1;
      this._timeouts = this._originalTimeouts;
    };
    RetryOperation.prototype.stop = function() {
      if (this._timeout) {
        clearTimeout(this._timeout);
      }
      this._timeouts = [];
      this._cachedTimeouts = null;
    };
    RetryOperation.prototype.retry = function(err) {
      if (this._timeout) {
        clearTimeout(this._timeout);
      }
      if (!err) {
        return false;
      }
      var currentTime = (/* @__PURE__ */ new Date()).getTime();
      if (err && currentTime - this._operationStart >= this._maxRetryTime) {
        this._errors.unshift(new Error("RetryOperation timeout occurred"));
        return false;
      }
      this._errors.push(err);
      var timeout = this._timeouts.shift();
      if (timeout === void 0) {
        if (this._cachedTimeouts) {
          this._errors.splice(this._errors.length - 1, this._errors.length);
          this._timeouts = this._cachedTimeouts.slice(0);
          timeout = this._timeouts.shift();
        } else {
          return false;
        }
      }
      var self = this;
      var timer = setTimeout(function() {
        self._attempts++;
        if (self._operationTimeoutCb) {
          self._timeout = setTimeout(function() {
            self._operationTimeoutCb(self._attempts);
          }, self._operationTimeout);
          if (self._options.unref) {
            self._timeout.unref();
          }
        }
        self._fn(self._attempts);
      }, timeout);
      if (this._options.unref) {
        timer.unref();
      }
      return true;
    };
    RetryOperation.prototype.attempt = function(fn, timeoutOps) {
      this._fn = fn;
      if (timeoutOps) {
        if (timeoutOps.timeout) {
          this._operationTimeout = timeoutOps.timeout;
        }
        if (timeoutOps.cb) {
          this._operationTimeoutCb = timeoutOps.cb;
        }
      }
      var self = this;
      if (this._operationTimeoutCb) {
        this._timeout = setTimeout(function() {
          self._operationTimeoutCb();
        }, self._operationTimeout);
      }
      this._operationStart = (/* @__PURE__ */ new Date()).getTime();
      this._fn(this._attempts);
    };
    RetryOperation.prototype.try = function(fn) {
      console.log("Using RetryOperation.try() is deprecated");
      this.attempt(fn);
    };
    RetryOperation.prototype.start = function(fn) {
      console.log("Using RetryOperation.start() is deprecated");
      this.attempt(fn);
    };
    RetryOperation.prototype.start = RetryOperation.prototype.try;
    RetryOperation.prototype.errors = function() {
      return this._errors;
    };
    RetryOperation.prototype.attempts = function() {
      return this._attempts;
    };
    RetryOperation.prototype.mainError = function() {
      if (this._errors.length === 0) {
        return null;
      }
      var counts = {};
      var mainError = null;
      var mainErrorCount = 0;
      for (var i = 0; i < this._errors.length; i++) {
        var error = this._errors[i];
        var message2 = error.message;
        var count = (counts[message2] || 0) + 1;
        counts[message2] = count;
        if (count >= mainErrorCount) {
          mainError = error;
          mainErrorCount = count;
        }
      }
      return mainError;
    };
  }
});

// artifacts/siwc-devkit/node_modules/retry/lib/retry.js
var require_retry = __commonJS({
  "artifacts/siwc-devkit/node_modules/retry/lib/retry.js"(exports2) {
    var RetryOperation = require_retry_operation();
    exports2.operation = function(options) {
      var timeouts = exports2.timeouts(options);
      return new RetryOperation(timeouts, {
        forever: options && options.forever,
        unref: options && options.unref,
        maxRetryTime: options && options.maxRetryTime
      });
    };
    exports2.timeouts = function(options) {
      if (options instanceof Array) {
        return [].concat(options);
      }
      var opts = {
        retries: 10,
        factor: 2,
        minTimeout: 1 * 1e3,
        maxTimeout: Infinity,
        randomize: false
      };
      for (var key in options) {
        opts[key] = options[key];
      }
      if (opts.minTimeout > opts.maxTimeout) {
        throw new Error("minTimeout is greater than maxTimeout");
      }
      var timeouts = [];
      for (var i = 0; i < opts.retries; i++) {
        timeouts.push(this.createTimeout(i, opts));
      }
      if (options && options.forever && !timeouts.length) {
        timeouts.push(this.createTimeout(i, opts));
      }
      timeouts.sort(function(a, b) {
        return a - b;
      });
      return timeouts;
    };
    exports2.createTimeout = function(attempt, opts) {
      var random = opts.randomize ? Math.random() + 1 : 1;
      var timeout = Math.round(random * opts.minTimeout * Math.pow(opts.factor, attempt));
      timeout = Math.min(timeout, opts.maxTimeout);
      return timeout;
    };
    exports2.wrap = function(obj, options, methods) {
      if (options instanceof Array) {
        methods = options;
        options = null;
      }
      if (!methods) {
        methods = [];
        for (var key in obj) {
          if (typeof obj[key] === "function") {
            methods.push(key);
          }
        }
      }
      for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        var original = obj[method];
        obj[method] = function retryWrapper(original2) {
          var op = exports2.operation(options);
          var args = Array.prototype.slice.call(arguments, 1);
          var callback = args.pop();
          args.push(function(err) {
            if (op.retry(err)) {
              return;
            }
            if (err) {
              arguments[0] = op.mainError();
            }
            callback.apply(this, arguments);
          });
          op.attempt(function() {
            original2.apply(obj, args);
          });
        }.bind(obj, original);
        obj[method].options = options;
      }
    };
  }
});

// artifacts/siwc-devkit/node_modules/retry/index.js
var require_retry2 = __commonJS({
  "artifacts/siwc-devkit/node_modules/retry/index.js"(exports2, module2) {
    module2.exports = require_retry();
  }
});

// artifacts/siwc-devkit/node_modules/signal-exit/signals.js
var require_signals = __commonJS({
  "artifacts/siwc-devkit/node_modules/signal-exit/signals.js"(exports2, module2) {
    module2.exports = [
      "SIGABRT",
      "SIGALRM",
      "SIGHUP",
      "SIGINT",
      "SIGTERM"
    ];
    if (process.platform !== "win32") {
      module2.exports.push(
        "SIGVTALRM",
        "SIGXCPU",
        "SIGXFSZ",
        "SIGUSR2",
        "SIGTRAP",
        "SIGSYS",
        "SIGQUIT",
        "SIGIOT"
        // should detect profiler and enable/disable accordingly.
        // see #21
        // 'SIGPROF'
      );
    }
    if (process.platform === "linux") {
      module2.exports.push(
        "SIGIO",
        "SIGPOLL",
        "SIGPWR",
        "SIGSTKFLT",
        "SIGUNUSED"
      );
    }
  }
});

// artifacts/siwc-devkit/node_modules/signal-exit/index.js
var require_signal_exit = __commonJS({
  "artifacts/siwc-devkit/node_modules/signal-exit/index.js"(exports2, module2) {
    var process2 = global.process;
    var processOk = function(process3) {
      return process3 && typeof process3 === "object" && typeof process3.removeListener === "function" && typeof process3.emit === "function" && typeof process3.reallyExit === "function" && typeof process3.listeners === "function" && typeof process3.kill === "function" && typeof process3.pid === "number" && typeof process3.on === "function";
    };
    if (!processOk(process2)) {
      module2.exports = function() {
        return function() {
        };
      };
    } else {
      assert = require("assert");
      signals = require_signals();
      isWin = /^win/i.test(process2.platform);
      EE = require("events");
      if (typeof EE !== "function") {
        EE = EE.EventEmitter;
      }
      if (process2.__signal_exit_emitter__) {
        emitter = process2.__signal_exit_emitter__;
      } else {
        emitter = process2.__signal_exit_emitter__ = new EE();
        emitter.count = 0;
        emitter.emitted = {};
      }
      if (!emitter.infinite) {
        emitter.setMaxListeners(Infinity);
        emitter.infinite = true;
      }
      module2.exports = function(cb, opts) {
        if (!processOk(global.process)) {
          return function() {
          };
        }
        assert.equal(typeof cb, "function", "a callback must be provided for exit handler");
        if (loaded === false) {
          load();
        }
        var ev = "exit";
        if (opts && opts.alwaysLast) {
          ev = "afterexit";
        }
        var remove = function() {
          emitter.removeListener(ev, cb);
          if (emitter.listeners("exit").length === 0 && emitter.listeners("afterexit").length === 0) {
            unload();
          }
        };
        emitter.on(ev, cb);
        return remove;
      };
      unload = function unload2() {
        if (!loaded || !processOk(global.process)) {
          return;
        }
        loaded = false;
        signals.forEach(function(sig2) {
          try {
            process2.removeListener(sig2, sigListeners[sig2]);
          } catch (er) {
          }
        });
        process2.emit = originalProcessEmit;
        process2.reallyExit = originalProcessReallyExit;
        emitter.count -= 1;
      };
      module2.exports.unload = unload;
      emit = function emit2(event, code, signal) {
        if (emitter.emitted[event]) {
          return;
        }
        emitter.emitted[event] = true;
        emitter.emit(event, code, signal);
      };
      sigListeners = {};
      signals.forEach(function(sig2) {
        sigListeners[sig2] = function listener() {
          if (!processOk(global.process)) {
            return;
          }
          var listeners = process2.listeners(sig2);
          if (listeners.length === emitter.count) {
            unload();
            emit("exit", null, sig2);
            emit("afterexit", null, sig2);
            if (isWin && sig2 === "SIGHUP") {
              sig2 = "SIGINT";
            }
            process2.kill(process2.pid, sig2);
          }
        };
      });
      module2.exports.signals = function() {
        return signals;
      };
      loaded = false;
      load = function load2() {
        if (loaded || !processOk(global.process)) {
          return;
        }
        loaded = true;
        emitter.count += 1;
        signals = signals.filter(function(sig2) {
          try {
            process2.on(sig2, sigListeners[sig2]);
            return true;
          } catch (er) {
            return false;
          }
        });
        process2.emit = processEmit;
        process2.reallyExit = processReallyExit;
      };
      module2.exports.load = load;
      originalProcessReallyExit = process2.reallyExit;
      processReallyExit = function processReallyExit2(code) {
        if (!processOk(global.process)) {
          return;
        }
        process2.exitCode = code || /* istanbul ignore next */
        0;
        emit("exit", process2.exitCode, null);
        emit("afterexit", process2.exitCode, null);
        originalProcessReallyExit.call(process2, process2.exitCode);
      };
      originalProcessEmit = process2.emit;
      processEmit = function processEmit2(ev, arg) {
        if (ev === "exit" && processOk(global.process)) {
          if (arg !== void 0) {
            process2.exitCode = arg;
          }
          var ret = originalProcessEmit.apply(this, arguments);
          emit("exit", process2.exitCode, null);
          emit("afterexit", process2.exitCode, null);
          return ret;
        } else {
          return originalProcessEmit.apply(this, arguments);
        }
      };
    }
    var assert;
    var signals;
    var isWin;
    var EE;
    var emitter;
    var unload;
    var emit;
    var sigListeners;
    var loaded;
    var load;
    var originalProcessReallyExit;
    var processReallyExit;
    var originalProcessEmit;
    var processEmit;
  }
});

// artifacts/siwc-devkit/node_modules/proper-lockfile/lib/mtime-precision.js
var require_mtime_precision = __commonJS({
  "artifacts/siwc-devkit/node_modules/proper-lockfile/lib/mtime-precision.js"(exports2, module2) {
    "use strict";
    var cacheSymbol = /* @__PURE__ */ Symbol();
    function probe(file, fs, callback) {
      const cachedPrecision = fs[cacheSymbol];
      if (cachedPrecision) {
        return fs.stat(file, (err, stat) => {
          if (err) {
            return callback(err);
          }
          callback(null, stat.mtime, cachedPrecision);
        });
      }
      const mtime = new Date(Math.ceil(Date.now() / 1e3) * 1e3 + 5);
      fs.utimes(file, mtime, mtime, (err) => {
        if (err) {
          return callback(err);
        }
        fs.stat(file, (err2, stat) => {
          if (err2) {
            return callback(err2);
          }
          const precision = stat.mtime.getTime() % 1e3 === 0 ? "s" : "ms";
          Object.defineProperty(fs, cacheSymbol, { value: precision });
          callback(null, stat.mtime, precision);
        });
      });
    }
    function getMtime(precision) {
      let now = Date.now();
      if (precision === "s") {
        now = Math.ceil(now / 1e3) * 1e3;
      }
      return new Date(now);
    }
    module2.exports.probe = probe;
    module2.exports.getMtime = getMtime;
  }
});

// artifacts/siwc-devkit/node_modules/proper-lockfile/lib/lockfile.js
var require_lockfile = __commonJS({
  "artifacts/siwc-devkit/node_modules/proper-lockfile/lib/lockfile.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var fs = require_graceful_fs();
    var retry = require_retry2();
    var onExit = require_signal_exit();
    var mtimePrecision = require_mtime_precision();
    var locks = {};
    function getLockFile(file, options) {
      return options.lockfilePath || `${file}.lock`;
    }
    function resolveCanonicalPath(file, options, callback) {
      if (!options.realpath) {
        return callback(null, path.resolve(file));
      }
      options.fs.realpath(file, callback);
    }
    function acquireLock(file, options, callback) {
      const lockfilePath = getLockFile(file, options);
      options.fs.mkdir(lockfilePath, (err) => {
        if (!err) {
          return mtimePrecision.probe(lockfilePath, options.fs, (err2, mtime, mtimePrecision2) => {
            if (err2) {
              options.fs.rmdir(lockfilePath, () => {
              });
              return callback(err2);
            }
            callback(null, mtime, mtimePrecision2);
          });
        }
        if (err.code !== "EEXIST") {
          return callback(err);
        }
        if (options.stale <= 0) {
          return callback(Object.assign(new Error("Lock file is already being held"), { code: "ELOCKED", file }));
        }
        options.fs.stat(lockfilePath, (err2, stat) => {
          if (err2) {
            if (err2.code === "ENOENT") {
              return acquireLock(file, { ...options, stale: 0 }, callback);
            }
            return callback(err2);
          }
          if (!isLockStale(stat, options)) {
            return callback(Object.assign(new Error("Lock file is already being held"), { code: "ELOCKED", file }));
          }
          removeLock(file, options, (err3) => {
            if (err3) {
              return callback(err3);
            }
            acquireLock(file, { ...options, stale: 0 }, callback);
          });
        });
      });
    }
    function isLockStale(stat, options) {
      return stat.mtime.getTime() < Date.now() - options.stale;
    }
    function removeLock(file, options, callback) {
      options.fs.rmdir(getLockFile(file, options), (err) => {
        if (err && err.code !== "ENOENT") {
          return callback(err);
        }
        callback();
      });
    }
    function updateLock(file, options) {
      const lock2 = locks[file];
      if (lock2.updateTimeout) {
        return;
      }
      lock2.updateDelay = lock2.updateDelay || options.update;
      lock2.updateTimeout = setTimeout(() => {
        lock2.updateTimeout = null;
        options.fs.stat(lock2.lockfilePath, (err, stat) => {
          const isOverThreshold = lock2.lastUpdate + options.stale < Date.now();
          if (err) {
            if (err.code === "ENOENT" || isOverThreshold) {
              return setLockAsCompromised(file, lock2, Object.assign(err, { code: "ECOMPROMISED" }));
            }
            lock2.updateDelay = 1e3;
            return updateLock(file, options);
          }
          const isMtimeOurs = lock2.mtime.getTime() === stat.mtime.getTime();
          if (!isMtimeOurs) {
            return setLockAsCompromised(
              file,
              lock2,
              Object.assign(
                new Error("Unable to update lock within the stale threshold"),
                { code: "ECOMPROMISED" }
              )
            );
          }
          const mtime = mtimePrecision.getMtime(lock2.mtimePrecision);
          options.fs.utimes(lock2.lockfilePath, mtime, mtime, (err2) => {
            const isOverThreshold2 = lock2.lastUpdate + options.stale < Date.now();
            if (lock2.released) {
              return;
            }
            if (err2) {
              if (err2.code === "ENOENT" || isOverThreshold2) {
                return setLockAsCompromised(file, lock2, Object.assign(err2, { code: "ECOMPROMISED" }));
              }
              lock2.updateDelay = 1e3;
              return updateLock(file, options);
            }
            lock2.mtime = mtime;
            lock2.lastUpdate = Date.now();
            lock2.updateDelay = null;
            updateLock(file, options);
          });
        });
      }, lock2.updateDelay);
      if (lock2.updateTimeout.unref) {
        lock2.updateTimeout.unref();
      }
    }
    function setLockAsCompromised(file, lock2, err) {
      lock2.released = true;
      if (lock2.updateTimeout) {
        clearTimeout(lock2.updateTimeout);
      }
      if (locks[file] === lock2) {
        delete locks[file];
      }
      lock2.options.onCompromised(err);
    }
    function lock(file, options, callback) {
      options = {
        stale: 1e4,
        update: null,
        realpath: true,
        retries: 0,
        fs,
        onCompromised: (err) => {
          throw err;
        },
        ...options
      };
      options.retries = options.retries || 0;
      options.retries = typeof options.retries === "number" ? { retries: options.retries } : options.retries;
      options.stale = Math.max(options.stale || 0, 2e3);
      options.update = options.update == null ? options.stale / 2 : options.update || 0;
      options.update = Math.max(Math.min(options.update, options.stale / 2), 1e3);
      resolveCanonicalPath(file, options, (err, file2) => {
        if (err) {
          return callback(err);
        }
        const operation = retry.operation(options.retries);
        operation.attempt(() => {
          acquireLock(file2, options, (err2, mtime, mtimePrecision2) => {
            if (operation.retry(err2)) {
              return;
            }
            if (err2) {
              return callback(operation.mainError());
            }
            const lock2 = locks[file2] = {
              lockfilePath: getLockFile(file2, options),
              mtime,
              mtimePrecision: mtimePrecision2,
              options,
              lastUpdate: Date.now()
            };
            updateLock(file2, options);
            callback(null, (releasedCallback) => {
              if (lock2.released) {
                return releasedCallback && releasedCallback(Object.assign(new Error("Lock is already released"), { code: "ERELEASED" }));
              }
              unlock(file2, { ...options, realpath: false }, releasedCallback);
            });
          });
        });
      });
    }
    function unlock(file, options, callback) {
      options = {
        fs,
        realpath: true,
        ...options
      };
      resolveCanonicalPath(file, options, (err, file2) => {
        if (err) {
          return callback(err);
        }
        const lock2 = locks[file2];
        if (!lock2) {
          return callback(Object.assign(new Error("Lock is not acquired/owned by you"), { code: "ENOTACQUIRED" }));
        }
        lock2.updateTimeout && clearTimeout(lock2.updateTimeout);
        lock2.released = true;
        delete locks[file2];
        removeLock(file2, options, callback);
      });
    }
    function check(file, options, callback) {
      options = {
        stale: 1e4,
        realpath: true,
        fs,
        ...options
      };
      options.stale = Math.max(options.stale || 0, 2e3);
      resolveCanonicalPath(file, options, (err, file2) => {
        if (err) {
          return callback(err);
        }
        options.fs.stat(getLockFile(file2, options), (err2, stat) => {
          if (err2) {
            return err2.code === "ENOENT" ? callback(null, false) : callback(err2);
          }
          return callback(null, !isLockStale(stat, options));
        });
      });
    }
    function getLocks() {
      return locks;
    }
    onExit(() => {
      for (const file in locks) {
        const options = locks[file].options;
        try {
          options.fs.rmdirSync(getLockFile(file, options));
        } catch (e) {
        }
      }
    });
    module2.exports.lock = lock;
    module2.exports.unlock = unlock;
    module2.exports.check = check;
    module2.exports.getLocks = getLocks;
  }
});

// artifacts/siwc-devkit/node_modules/proper-lockfile/lib/adapter.js
var require_adapter = __commonJS({
  "artifacts/siwc-devkit/node_modules/proper-lockfile/lib/adapter.js"(exports2, module2) {
    "use strict";
    var fs = require_graceful_fs();
    function createSyncFs(fs2) {
      const methods = ["mkdir", "realpath", "stat", "rmdir", "utimes"];
      const newFs = { ...fs2 };
      methods.forEach((method) => {
        newFs[method] = (...args) => {
          const callback = args.pop();
          let ret;
          try {
            ret = fs2[`${method}Sync`](...args);
          } catch (err) {
            return callback(err);
          }
          callback(null, ret);
        };
      });
      return newFs;
    }
    function toPromise(method) {
      return (...args) => new Promise((resolve, reject) => {
        args.push((err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
        method(...args);
      });
    }
    function toSync(method) {
      return (...args) => {
        let err;
        let result;
        args.push((_err, _result) => {
          err = _err;
          result = _result;
        });
        method(...args);
        if (err) {
          throw err;
        }
        return result;
      };
    }
    function toSyncOptions(options) {
      options = { ...options };
      options.fs = createSyncFs(options.fs || fs);
      if (typeof options.retries === "number" && options.retries > 0 || options.retries && typeof options.retries.retries === "number" && options.retries.retries > 0) {
        throw Object.assign(new Error("Cannot use retries with the sync api"), { code: "ESYNC" });
      }
      return options;
    }
    module2.exports = {
      toPromise,
      toSync,
      toSyncOptions
    };
  }
});

// artifacts/siwc-devkit/node_modules/proper-lockfile/index.js
var require_proper_lockfile = __commonJS({
  "artifacts/siwc-devkit/node_modules/proper-lockfile/index.js"(exports2, module2) {
    "use strict";
    var lockfile2 = require_lockfile();
    var { toPromise, toSync, toSyncOptions } = require_adapter();
    async function lock(file, options) {
      const release = await toPromise(lockfile2.lock)(file, options);
      return toPromise(release);
    }
    function lockSync(file, options) {
      const release = toSync(lockfile2.lock)(file, toSyncOptions(options));
      return toSync(release);
    }
    function unlock(file, options) {
      return toPromise(lockfile2.unlock)(file, options);
    }
    function unlockSync(file, options) {
      return toSync(lockfile2.unlock)(file, toSyncOptions(options));
    }
    function check(file, options) {
      return toPromise(lockfile2.check)(file, options);
    }
    function checkSync(file, options) {
      return toSync(lockfile2.check)(file, toSyncOptions(options));
    }
    module2.exports = lock;
    module2.exports.lock = lock;
    module2.exports.unlock = unlock;
    module2.exports.lockSync = lockSync;
    module2.exports.unlockSync = unlockSync;
    module2.exports.check = check;
    module2.exports.checkSync = checkSync;
  }
});

// artifacts/siwc-devkit/packages/local/src/index.ts
var index_exports = {};
__export(index_exports, {
  CHATGPT_USAGE_URL: () => CHATGPT_USAGE_URL,
  ChatGPTError: () => ChatGPTError,
  createChatGPT: () => createChatGPT
});
module.exports = __toCommonJS(index_exports);
var import_node_crypto3 = require("node:crypto");
var import_node_os = require("node:os");
var import_node_path2 = require("node:path");

// artifacts/siwc-devkit/packages/local/src/errors.ts
var ChatGPTError = class extends Error {
  code;
  retryable;
  status;
  requestId;
  param;
  responseShape;
  constructor(code, message2, retryable = false, status, diagnostics = {}) {
    super(message2);
    this.name = "ChatGPTError";
    this.code = code;
    this.retryable = retryable;
    if (status !== void 0) this.status = status;
    if (diagnostics.requestId !== void 0) this.requestId = diagnostics.requestId;
    if (diagnostics.param !== void 0) this.param = diagnostics.param;
    if (diagnostics.responseShape !== void 0) this.responseShape = diagnostics.responseShape;
  }
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      ...this.status !== void 0 ? { status: this.status } : {},
      ...this.requestId !== void 0 ? { requestId: this.requestId } : {},
      ...this.param !== void 0 ? { param: this.param } : {},
      ...this.responseShape !== void 0 ? { responseShape: this.responseShape } : {}
    };
  }
};
var API_ERRORS = {
  subscription_sharing_user_not_eligible: ["Token sharing is not available for this ChatGPT account or workspace.", false],
  subscription_sharing_usage_limit_exceeded: ["A ChatGPT sharing limit has been reached. Check your usage and app limits in ChatGPT Settings.", false],
  subscription_sharing_usage_unavailable: ["ChatGPT usage could not be checked. Try again shortly.", true],
  subscription_sharing_unsupported_capability: ["This request includes a capability that token sharing does not support.", false],
  subscription_sharing_route_not_supported: ["This request uses a route that token sharing does not support.", false],
  subscription_sharing_invalid_user: ["ChatGPT could not validate the selected account's subscription context. Check this connection and its granted permissions.", false],
  subscription_sharing_user_unavailable: ["Your ChatGPT account or workspace is temporarily unavailable. Try again shortly.", true],
  chatpass_v2_scope_not_authorized: ["The granted ChatGPT permissions do not authorize this request. Check the app and grant configuration.", false],
  chatpass_v2_invalid_authorization_context: ["The ChatGPT authorization context does not permit this request. Check the app and grant configuration.", false],
  invalid_client: ["ChatGPT rejected the app's client configuration. Check the saved registration before trying again.", false],
  invalid_grant: ["ChatGPT did not accept this authorization grant. Start sign-in again with the saved connection.", false],
  invalid_refresh_token: ["Your ChatGPT connection can no longer be renewed. Sign in again.", false],
  token_expired: ["Your ChatGPT connection can no longer be renewed. Sign in again.", false],
  refresh_token_expired: ["Your ChatGPT connection can no longer be renewed. Sign in again.", false],
  refresh_token_invalidated: ["Your ChatGPT connection can no longer be renewed. Sign in again.", false],
  refresh_token_reused: ["Your ChatGPT connection can no longer be renewed. Sign in again.", false],
  invalid_token: ["ChatGPT did not accept this credential. Check the selected connection and its granted permissions.", false],
  invalid_api_key: ["ChatGPT did not accept this credential. Check the selected connection and its granted permissions.", false],
  access_denied: ["Sign-in was not completed. You can try again when you are ready.", false],
  model_not_found: ["This model is not available for your ChatGPT connection. Choose a supported model.", false]
};
var LEGACY_CODES = {
  subscription_sharing_v2_user_not_eligible: "subscription_sharing_user_not_eligible",
  subscription_sharing_v2_route_not_supported: "subscription_sharing_route_not_supported",
  subscription_sharing_v2_invalid_user: "subscription_sharing_invalid_user",
  subscription_sharing_v2_user_unavailable: "subscription_sharing_user_unavailable"
};
var REQUEST_FIELDS = {
  input: "input",
  model: "model",
  instructions: "instructions",
  store: "storage setting",
  stream: "streaming setting",
  tools: "tools",
  background: "background setting",
  conversation: "conversation setting"
};
var SHAPE_FIELDS = /* @__PURE__ */ new Set(["error", "detail", "code", "message", "type", "param", "loc", "input", "ctx", "response", "status", "request_id"]);
function shapeOf(value, depth = 0) {
  if (value === null) return "null";
  if (Array.isArray(value)) return depth < 3 ? `[${value.length ? shapeOf(value[0], depth + 1) : ""}]` : "array";
  if (!isObject(value)) return typeof value;
  if (depth >= 3) return "object";
  const fields = Object.entries(value).filter(([key]) => SHAPE_FIELDS.has(key)).slice(0, 12);
  const unknownCount = Object.keys(value).length - fields.length;
  return `{${[
    ...fields.map(([key, child]) => `${key}:${key === "input" || key === "ctx" ? "redacted" : shapeOf(child, depth + 1)}`),
    ...unknownCount ? [`other:${unknownCount}`] : []
  ].join(",")}}`;
}
function safeIdentifier(value, maxLength = 160) {
  return typeof value === "string" && value.length <= maxLength && /^[a-zA-Z0-9_][a-zA-Z0-9_.:[\]-]*$/.test(value) ? value : void 0;
}
function invalidRequest(detail) {
  const issues = Array.isArray(detail.detail) ? detail.detail.filter(isObject) : [detail];
  for (const issue of issues) {
    const locations = Array.isArray(issue.loc) ? issue.loc : [issue.param];
    const field = locations.find((value) => typeof value === "string" && Object.hasOwn(REQUEST_FIELDS, value));
    if (field === "input" && issue.type === "list_type") {
      return "ChatGPT requires input as a list of messages. Update the app's request format.";
    }
    if (field) return `ChatGPT rejected the request's ${REQUEST_FIELDS[field]}. Check its format and supported values.`;
  }
  return "ChatGPT rejected this request. Check its input, model, and supported options.";
}
function apiError(body, status, requestId) {
  let detail = isObject(body) ? body : {};
  for (let depth = 0; depth < 4; depth += 1) {
    if (isObject(detail.error)) detail = detail.error;
    else if (isObject(detail.detail)) detail = detail.detail;
    else break;
  }
  const code = safeIdentifier(typeof detail.error === "string" ? detail.error : detail.code, 100) ?? "api_error";
  const safeRequestId = safeIdentifier(requestId);
  const param = safeIdentifier(detail.param);
  const diagnostics = {
    responseShape: shapeOf(body),
    ...safeRequestId ? { requestId: safeRequestId } : {},
    ...param ? { param } : {}
  };
  const error = (message2, retryable = false) => new ChatGPTError(code, message2, retryable, status, diagnostics);
  const known = API_ERRORS[code] ?? API_ERRORS[LEGACY_CODES[code] ?? ""];
  if (known) return error(known[0], known[1]);
  if (code === "subscription_sharing_v2_client_not_enabled") return error("This app is not enabled for token sharing. Contact the app developer.");
  if (status === 400 || status === 422 || code === "invalid_request_error" || code === "invalid_request") return error(invalidRequest(detail));
  if (status === 401) return error("ChatGPT did not accept the selected connection's signed identity or direct permission. Check the profile and granted scopes.");
  if (status === 403) return error("A ChatGPT policy or permission restriction prevented this request. Check the app's configuration and permitted serving region.");
  if (status === 429) return error("Too many requests. Wait a moment before trying again.", true);
  if (status && status >= 500) return error("ChatGPT is temporarily unavailable. Try again shortly.", true);
  return error("ChatGPT could not complete this request.");
}
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function asError(error) {
  if (error instanceof ChatGPTError) return error;
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return new ChatGPTError("cancelled", "The request was cancelled.");
  }
  return new ChatGPTError("connection_error", "The connection could not be completed. Try again.", true);
}
function requiresReauthentication(error) {
  return ["invalid_grant", "invalid_refresh_token", "token_expired", "refresh_token_expired", "refresh_token_invalidated", "refresh_token_reused"].includes(error.code);
}
async function fetchRemote(url, init = {}, timeoutMs = 3e4) {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  try {
    return await fetch(url, { ...init, signal, redirect: "error" });
  } catch {
    if (init.signal?.aborted) throw new ChatGPTError("cancelled", "The request was cancelled.");
    throw new ChatGPTError("network_error", "Could not reach ChatGPT. Check your connection and try again.", true);
  }
}
async function jsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw asError(error);
    }
    if (!response.ok) throw apiError(void 0, response.status, response.headers.get("x-request-id"));
    throw new ChatGPTError("invalid_response", "ChatGPT returned an unexpected response. Try again.", true, response.status);
  }
}

// artifacts/siwc-devkit/packages/local/src/models.ts
async function listModels(accessToken, signal) {
  const response = await fetchRemote("https://api.openai.com/v1/models", {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    signal
  });
  const body = await jsonResponse(response);
  if (!response.ok) throw apiError(body, response.status, response.headers.get("x-request-id"));
  if (!isObject(body) || !Array.isArray(body.models)) {
    throw new ChatGPTError("invalid_model_catalog", "ChatGPT returned an unexpected model catalog. Try again.", true, response.status);
  }
  const result = [];
  for (const model of body.models) {
    if (!isObject(model) || model.visibility !== "list") continue;
    if (typeof model.slug !== "string" || !model.slug.trim() || model.slug.length > 200 || typeof model.display_name !== "string" || !model.display_name.trim() || model.display_name.length > 200) {
      throw new ChatGPTError("invalid_model_catalog", "ChatGPT returned an incomplete model listing. Try again.", true, response.status);
    }
    result.push({ slug: model.slug, displayName: model.display_name, ...Object.fromEntries(["context_window","context_length","max_context_window","max_input_tokens","max_output_tokens"].filter(k=>Number.isSafeInteger(model[k])&&model[k]>0).map(k=>[k,model[k]])) });
  }
  return result;
}

// artifacts/siwc-devkit/packages/local/src/oauth.ts
var import_node_crypto = require("node:crypto");
var import_node_http = require("node:http");
var import_node_child_process = require("node:child_process");
var import_promises = require("node:timers/promises");

// artifacts/siwc-devkit/node_modules/jose/dist/webapi/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var strictDecoder = new TextDecoder("utf-8", { fatal: true });
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0), buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers)
    buf.set(buffer, i), i += buffer.length;
  return buf;
}
var NON_ASCII = /[^\x00-\x7f]/;
function encode(string) {
  if (typeof string == "string" && string.length >= 128) {
    if (NON_ASCII.test(string))
      throw new TypeError("non-ASCII string encountered in encode()");
    return encoder.encode(string);
  }
  const bytes = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    if (code > 127)
      throw new TypeError("non-ASCII string encountered in encode()");
    bytes[i] = code;
  }
  return bytes;
}
function decodeBase64(encoded, url = false) {
  if (Uint8Array.fromBase64)
    return Uint8Array.fromBase64(encoded, { alphabet: url ? "base64url" : "base64" });
  if (url) {
    if (encoded.includes("+") || encoded.includes("/"))
      throw new TypeError("Invalid base64url");
    encoded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  }
  const binary = atob(encoded), bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++)
    bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// artifacts/siwc-devkit/node_modules/jose/dist/webapi/util/errors.js
var JOSEError = class extends Error {
  static code = "ERR_JOSE_GENERIC";
  code = "ERR_JOSE_GENERIC";
  constructor(message2, options) {
    super(message2, options), this.name = this.constructor.name, Error.captureStackTrace?.(this, this.constructor);
  }
};
var JWTClaimValidationFailed = class extends JOSEError {
  static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } }), this.claim = claim, this.reason = reason, this.payload = payload;
  }
};
var JWTExpired = class extends JOSEError {
  static code = "ERR_JWT_EXPIRED";
  code = "ERR_JWT_EXPIRED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } }), this.claim = claim, this.reason = reason, this.payload = payload;
  }
};
var JOSEAlgNotAllowed = class extends JOSEError {
  static code = "ERR_JOSE_ALG_NOT_ALLOWED";
  code = "ERR_JOSE_ALG_NOT_ALLOWED";
};
var JOSENotSupported = class extends JOSEError {
  static code = "ERR_JOSE_NOT_SUPPORTED";
  code = "ERR_JOSE_NOT_SUPPORTED";
};
var JWSInvalid = class extends JOSEError {
  static code = "ERR_JWS_INVALID";
  code = "ERR_JWS_INVALID";
};
var JWTInvalid = class extends JOSEError {
  static code = "ERR_JWT_INVALID";
  code = "ERR_JWT_INVALID";
};
var JWKSInvalid = class extends JOSEError {
  static code = "ERR_JWKS_INVALID";
  code = "ERR_JWKS_INVALID";
};
var JWKSNoMatchingKey = class extends JOSEError {
  static code = "ERR_JWKS_NO_MATCHING_KEY";
  code = "ERR_JWKS_NO_MATCHING_KEY";
  constructor(message2 = "no applicable key found in the JSON Web Key Set", options) {
    super(message2, options);
  }
};
var JWKSMultipleMatchingKeys = class extends JOSEError {
  [Symbol.asyncIterator] = async function* () {
  };
  static code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  constructor(message2 = "multiple matching keys found in the JSON Web Key Set", options) {
    super(message2, options);
  }
};
var JWKSTimeout = class extends JOSEError {
  static code = "ERR_JWKS_TIMEOUT";
  code = "ERR_JWKS_TIMEOUT";
  constructor(message2 = "request timed out", options) {
    super(message2, options);
  }
};
var JWSSignatureVerificationFailed = class extends JOSEError {
  static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  constructor(message2 = "signature verification failed", options) {
    super(message2, options);
  }
};

// artifacts/siwc-devkit/node_modules/jose/dist/webapi/util/base64url.js
var invalid = "The input to be decoded is not correctly encoded.";
function decode(input) {
  try {
    return decodeBase64(typeof input == "string" ? input : decoder.decode(input), true);
  } catch (cause) {
    throw new TypeError(invalid, { cause });
  }
}

// artifacts/siwc-devkit/node_modules/jose/dist/webapi/lib/validate.js
function isObject2(input) {
  if (typeof input != "object" || input === null || Object.prototype.toString.call(input) !== "[object Object]")
    return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}
function isJwkSet(input) {
  return isObject2(input) && Array.isArray(input.keys) && Array.from(input.keys).every(isObject2);
}
function isDisjoint(...headers) {
  const parameters = /* @__PURE__ */ new Set();
  for (const header of headers)
    if (header)
      for (const parameter of Object.keys(header)) {
        if (parameters.has(parameter))
          return false;
        parameters.add(parameter);
      }
  return true;
}
function decodeBase64url(value, label, ErrorClass) {
  try {
    return decode(value);
  } catch {
    throw new ErrorClass(`Failed to base64url decode the ${label}`);
  }
}
function encodeBase64url(value, label, ErrorClass) {
  try {
    return encode(value);
  } catch {
    throw new ErrorClass(`The ${label} is not a valid base64url string`);
  }
}
function parseJoseHeader(b64, ErrorClass, message2) {
  let parsed;
  try {
    parsed = JSON.parse(strictDecoder.decode(decode(b64)));
  } catch {
    throw new ErrorClass(message2);
  }
  if (!isObject2(parsed))
    throw new ErrorClass(message2);
  return parsed;
}
var JWS_RECOGNIZED = { __proto__: null, b64: true };
function validateAlgorithms(option, algorithms) {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s != "string")))
    throw new TypeError(`"${option}" option must be an array of strings`);
  return algorithms === void 0 ? void 0 : new Set(algorithms);
}
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0)
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  if (!protectedHeader || protectedHeader.crit === void 0)
    return [];
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input != "string" || input.length === 0))
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  const recognized = recognizedOption === void 0 ? recognizedDefault : { __proto__: null, ...recognizedOption, ...recognizedDefault };
  for (const parameter of protectedHeader.crit) {
    if (!(parameter in recognized))
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    if (!Object.hasOwn(joseHeader, parameter) || joseHeader[parameter] === void 0)
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    if (recognized[parameter] && (!Object.hasOwn(protectedHeader, parameter) || protectedHeader[parameter] === void 0))
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
  }
  return protectedHeader.crit;
}
function validateB64(protectedHeader, extensions) {
  if (extensions.includes("b64")) {
    const b64 = protectedHeader.b64;
    if (typeof b64 != "boolean")
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    return b64;
  }
  return true;
}

// artifacts/siwc-devkit/node_modules/jose/dist/webapi/lib/key.js
var tag = (key) => key[Symbol.toStringTag];
var jwkMatchesOp = (entry, key, usage) => {
  const { alg } = entry;
  if (key.use !== void 0) {
    const expected = usage === "sign" || usage === "verify" ? "sig" : "enc";
    if (key.use !== expected)
      throw new TypeError(`Invalid key for this operation, its "use" must be "${expected}" when present`);
  }
  if (key.alg !== void 0 && key.alg !== alg)
    throw new TypeError(`Invalid key for this operation, its "alg" must be "${alg}" when present`);
  if (Array.isArray(key.key_ops)) {
    const expectedKeyOp = usage === "encrypt" || usage === "decrypt" ? entry.ops?.[usage === "encrypt" ? 0 : 1] : usage;
    if (expectedKeyOp && !key.key_ops.includes(expectedKeyOp))
      throw new TypeError(`Invalid key for this operation, its "key_ops" must include "${expectedKeyOp}" when present`);
  }
};
async function prepareKey(entry, key, usage) {
  const { alg, secret } = entry, privateKey = usage === "decrypt" || usage === "sign";
  if (secret && key instanceof Uint8Array)
    return key;
  let normalized, keyObject;
  if (isObject2(key)) {
    if (normalized = normalizeJwk(key), typeof normalized.kty != "string")
      throw invalidKeyType(alg, key, secret);
    if (!(secret ? normalized.kty === "oct" && typeof normalized.k == "string" : normalized.kty !== "oct" && (privateKey ? normalized.kty === "AKP" && typeof normalized.priv == "string" || typeof normalized.d == "string" : normalized.d === void 0 && normalized.priv === void 0)))
      throw new TypeError(secret ? 'JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present' : `JSON Web Key for this operation must be a ${privateKey ? "private" : "public"} JWK`);
    if (jwkMatchesOp(entry, normalized, usage), normalized.kty === "oct")
      return decode(normalized.k);
    if (!Object.isFrozen(key)) {
      const { key_ops } = key;
      Array.isArray(key_ops) && Object.freeze(key_ops), Object.freeze(key);
    }
  } else {
    if (!isKeyLike(key))
      throw invalidKeyType(alg, key, secret);
    const expectedType = secret ? "secret" : privateKey ? "private" : "public";
    if (key.type !== expectedType && (secret || ["secret", "public", "private"].includes(key.type)))
      throw new TypeError(`${tag(key)} instances must be of type "${expectedType}" for the ${alg} algorithm`);
    if (isCryptoKey(key))
      return key;
    if (keyObject = key, keyObject.type === "secret")
      return keyObject.export();
  }
  cache ||= /* @__PURE__ */ new WeakMap();
  const cacheKey = key;
  let cached = cache.get(cacheKey);
  if (cached?.[alg])
    return cached[alg];
  if (cached || cache.set(cacheKey, cached = {}), keyObject && typeof keyObject.toCryptoKey == "function") {
    const isPublic = keyObject.type === "public", crv = nist[keyObject.asymmetricKeyDetails?.namedCurve], params = entry.resolve?.({ crv, asymmetricKeyType: keyObject.asymmetricKeyType }) ?? entry.subtle;
    return cached[alg] = keyObject.toCryptoKey(params, isPublic, entry.usages[isPublic ? 0 : 1]);
  }
  return normalized ??= keyObject.export({ format: "jwk" }), normalized.alg = alg, cached[alg] = await jwkToKey(entry, normalized);
}
var cache;
var nist = {
  __proto__: null,
  prime256v1: "P-256",
  secp384r1: "P-384",
  secp521r1: "P-521"
};
var isCryptoKey = (key) => {
  if (key?.[Symbol.toStringTag] === "CryptoKey")
    return true;
  try {
    return key instanceof CryptoKey;
  } catch {
    return false;
  }
};
var isKeyObject = (key) => key?.[Symbol.toStringTag] === "KeyObject";
var isKeyLike = (key) => isCryptoKey(key) || isKeyObject(key);
function message(msg, actual, ...types) {
  if (types.length > 2) {
    const last = types.pop();
    msg += `one of type ${types.join(", ")}, or ${last}.`;
  } else types.length === 2 ? msg += `one of type ${types[0]} or ${types[1]}.` : msg += `of type ${types[0]}.`;
  return actual == null ? msg += ` Received ${actual}` : typeof actual == "function" && actual.name ? msg += ` Received function ${actual.name}` : typeof actual == "object" && actual != null && actual.constructor?.name && (msg += ` Received an instance of ${actual.constructor.name}`), msg;
}
function invalidKeyType(alg, actual, secret) {
  const types = ["CryptoKey", "KeyObject", "JSON Web Key"];
  return secret && types.push("Uint8Array"), new TypeError(message(`Key for the ${alg} algorithm must be `, actual, ...types));
}
var unusable = (name, prop = "algorithm.name") => new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
function checkUsage(key, usage) {
  if (usage && !key.usages.includes(usage))
    throw new TypeError(`CryptoKey does not support this operation, its usages must include ${usage}.`);
}
function checkModulusLength(alg, key) {
  const { modulusLength } = key.algorithm;
  if (typeof modulusLength != "number" || modulusLength < 2048)
    throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
}
function checkCryptoKey(key, expected, usage) {
  const algorithm = key.algorithm;
  if (algorithm.name !== expected.name)
    throw unusable(expected.name);
  if (expected.hash && algorithm.hash?.name !== expected.hash)
    throw unusable(expected.hash, "algorithm.hash");
  if (expected.namedCurve && algorithm.namedCurve !== expected.namedCurve)
    throw unusable(expected.namedCurve, "algorithm.namedCurve");
  if (expected.length !== void 0 && algorithm.length !== expected.length)
    throw unusable(expected.length, "algorithm.length");
  checkUsage(key, usage);
}
function snapshotJwk(jwk) {
  return { __proto__: null, ...jwk };
}
function normalizeJwk(jwk) {
  const normalized = snapshotJwk(jwk);
  if (normalized.ext !== void 0 && typeof normalized.ext != "boolean")
    throw new TypeError('"ext" (Extractable) Parameter must be a boolean');
  if (normalized.key_ops !== void 0) {
    const value = normalized.key_ops, keyOps = Array.isArray(value) ? [...value] : void 0;
    if (!keyOps || keyOps.some((operation) => typeof operation != "string") || new Set(keyOps).size !== keyOps.length)
      throw new TypeError('"key_ops" (Key Operations) Parameter must be an array of unique strings');
    normalized.key_ops = keyOps;
  }
  return normalized;
}
async function jwkToKey(entry, jwk, extractable) {
  if (!entry.kty.includes(jwk.kty))
    throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
  const algorithm = entry.resolve?.({ kty: jwk.kty, crv: jwk.crv }) ?? entry.subtle, isPrivate = !!(jwk.d || jwk.priv), keyData = { ...jwk, ext: extractable ?? jwk.ext };
  return keyData.kty !== "AKP" && delete keyData.alg, delete keyData.use, crypto.subtle.importKey("jwk", keyData, algorithm, keyData.ext ?? !isPrivate, jwk.key_ops ?? entry.usages[isPrivate ? 1 : 0]);
}
async function rawKey(key, expected, usage, extractable = false) {
  return key instanceof Uint8Array && (key = await crypto.subtle.importKey("raw", key, expected, extractable, [usage])), checkCryptoKey(key, expected, usage), key;
}

// artifacts/siwc-devkit/node_modules/jose/dist/webapi/lib/key_descriptor.js
function table(entries) {
  const out = { __proto__: null };
  for (const alg in entries)
    out[alg] = { ...entries[alg], alg };
  return out;
}

// artifacts/siwc-devkit/node_modules/jose/dist/webapi/lib/jws_algorithms.js
var sig = [["verify"], ["sign"]];
function hmac(bits) {
  const subtle = { name: "HMAC", hash: `SHA-${bits}` };
  return { kty: ["oct"], secret: true, subtle, signing: subtle, usages: sig };
}
function rsa(bits, saltLength) {
  const subtle = { name: saltLength ? "RSA-PSS" : "RSASSA-PKCS1-v1_5", hash: `SHA-${bits}` };
  return {
    kty: ["RSA"],
    subtle,
    signing: saltLength ? { ...subtle, saltLength } : subtle,
    usages: sig,
    minRsaBits: 2048
  };
}
function ecdsa(crv, bits) {
  return {
    kty: ["EC"],
    crv,
    subtle: { name: "ECDSA", namedCurve: crv },
    signing: { name: "ECDSA", hash: `SHA-${bits}` },
    usages: sig
  };
}
function eddsa() {
  const subtle = { name: "Ed25519" };
  return {
    kty: ["OKP"],
    crv: "Ed25519",
    subtle,
    signing: subtle,
    usages: sig
  };
}
function mldsa(bits) {
  const subtle = { name: `ML-DSA-${bits}` };
  return {
    kty: ["AKP"],
    subtle,
    signing: subtle,
    usages: sig
  };
}
var JWS = table({
  HS256: hmac(256),
  HS384: hmac(384),
  HS512: hmac(512),
  RS256: rsa(256),
  RS384: rsa(384),
  RS512: rsa(512),
  PS256: rsa(256, 32),
  PS384: rsa(384, 48),
  PS512: rsa(512, 64),
  ES256: ecdsa("P-256", 256),
  ES384: ecdsa("P-384", 384),
  ES512: ecdsa("P-521", 512),
  EdDSA: eddsa(),
  Ed25519: eddsa(),
  "ML-DSA-44": mldsa(44),
  "ML-DSA-65": mldsa(65),
  "ML-DSA-87": mldsa(87)
});
function jwsAlgorithm(alg) {
  const entry = typeof alg == "string" ? JWS[alg] : void 0;
  if (!entry)
    throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  return entry;
}

// artifacts/siwc-devkit/node_modules/jose/dist/webapi/lib/jws_verify.js
function prepareVerify(options) {
  return [options && validateAlgorithms("algorithms", options.algorithms), options?.crit];
}
function parseProtectedHeader(encodedProtected) {
  return encodedProtected === void 0 ? {} : parseJoseHeader(encodedProtected, JWSInvalid, "JWS Protected Header is invalid");
}
function encodeCompactUnencodedPayload(payload) {
  try {
    return encode(payload);
  } catch {
    throw new JWSInvalid("JWS Compact Serialization payload must use only ASCII characters");
  }
}
async function verifySignature(jws, shared, key, encodeUnencodedPayload, parsedProtected) {
  const { protected: encodedProtected, header, payload: inputPayload } = jws, parsedProt = parsedProtected ?? parseProtectedHeader(encodedProtected);
  if (!isDisjoint(parsedProt, header))
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  const joseHeader = { ...parsedProt, ...header }, b64 = validateB64(parsedProt, validateCrit(JWSInvalid, JWS_RECOGNIZED, shared[1], parsedProt, joseHeader)), { alg } = joseHeader;
  if (typeof alg != "string" || !alg)
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  if (shared[0] && !shared[0].has(alg))
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  if (b64) {
    if (typeof inputPayload != "string")
      throw new JWSInvalid("JWS Payload must be a string");
  } else if (typeof inputPayload != "string" && !(inputPayload instanceof Uint8Array))
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  const signingPayload = b64 || typeof inputPayload != "string" ? inputPayload : encodeUnencodedPayload(inputPayload);
  let resolvedKey = false;
  typeof key == "function" && (key = await key(parsedProt, jws), resolvedKey = true);
  const entry = jwsAlgorithm(alg), data = concat(encodedProtected !== void 0 ? encode(encodedProtected) : new Uint8Array(), encode("."), typeof signingPayload == "string" ? shared[2] ??= encodeBase64url(signingPayload, "payload", JWSInvalid) : signingPayload), signature = decodeBase64url(jws.signature, "signature", JWSInvalid), k = await prepareKey(entry, key, "verify"), cryptoKey = await rawKey(k, entry.subtle, "verify");
  entry.minRsaBits && checkModulusLength(entry.alg, cryptoKey);
  let verified = false;
  try {
    verified = await crypto.subtle.verify(entry.signing, cryptoKey, signature, data);
  } catch {
  }
  if (!verified)
    throw new JWSSignatureVerificationFailed();
  const result = { payload: typeof signingPayload == "string" ? decodeBase64url(signingPayload, "payload", JWSInvalid) : signingPayload };
  return encodedProtected !== void 0 && (result.protectedHeader = parsedProt), header !== void 0 && (result.unprotectedHeader = header), resolvedKey ? [{ ...result, key: k }, b64] : [result, b64];
}
async function verifyCompact(jws, shared, key) {
  if (jws instanceof Uint8Array && (jws = decoder.decode(jws)), typeof jws != "string")
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3)
    throw new JWSInvalid("Invalid Compact JWS");
  return verifySignature({ payload, protected: protectedHeader, signature }, shared, key, encodeCompactUnencodedPayload);
}

// artifacts/siwc-devkit/node_modules/jose/dist/webapi/lib/jwt_claims_set.js
var epoch = (date) => Math.floor(date.getTime() / 1e3);
var multipliers = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
  y: 31557600
};
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
var checkFailed = "check_failed";
function invalidDuration() {
  throw new TypeError("Invalid time period format");
}
function secs(str) {
  typeof str != "string" && invalidDuration();
  const matched = REGEX.exec(str);
  (!matched || matched[4] && matched[1]) && invalidDuration();
  const value = parseFloat(matched[2]), numericDate2 = Math.round(value * multipliers[matched[3][0].toLowerCase()]);
  return Number.isFinite(numericDate2) || invalidDuration(), matched[1] === "-" || matched[4] === "ago" ? -numericDate2 : numericDate2;
}
function validateInput(label, input) {
  if (!Number.isFinite(input))
    throw new TypeError(`Invalid ${label} input`);
  return input;
}
var normalizeTyp = (value) => {
  const normalized = value.toLowerCase();
  return value.includes("/") ? normalized : `application/${normalized}`;
};
var checkAudiencePresence = (audPayload, audOption) => typeof audPayload == "string" ? audOption.includes(audPayload) : Array.isArray(audPayload) ? audOption.some((aud) => audPayload.includes(aud)) : false;
function validateNumericDate(payload, claim, required = false) {
  const value = payload[claim];
  if (!(value === void 0 && !required)) {
    if (typeof value != "number")
      throw new JWTClaimValidationFailed(`"${claim}" claim must be a number`, payload, claim, "invalid");
    return value;
  }
}
function unexpectedClaim(payload, claim) {
  throw new JWTClaimValidationFailed(`unexpected "${claim}" claim value`, payload, claim, checkFailed);
}
function validateClaimsSet(protectedHeader, encodedPayload, options = {}) {
  let payload;
  try {
    payload = JSON.parse(strictDecoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject2(payload))
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  const { typ } = options;
  if (typ !== void 0 && (typeof protectedHeader.typ != "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ)))
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", checkFailed);
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options, presenceCheck = [...requiredClaims];
  maxTokenAge !== void 0 && presenceCheck.push("iat"), audience !== void 0 && presenceCheck.push("aud"), subject !== void 0 && presenceCheck.push("sub"), issuer !== void 0 && presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse()))
    if (!Object.hasOwn(payload, claim))
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
  issuer !== void 0 && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss) && unexpectedClaim(payload, "iss"), subject !== void 0 && payload.sub !== subject && unexpectedClaim(payload, "sub"), audience !== void 0 && !checkAudiencePresence(payload.aud, typeof audience == "string" ? [audience] : audience) && unexpectedClaim(payload, "aud");
  const { clockTolerance } = options;
  let tolerance = 0;
  if (typeof clockTolerance == "string")
    tolerance = secs(clockTolerance);
  else if (clockTolerance !== void 0) {
    if (typeof clockTolerance != "number")
      throw new TypeError("Invalid clockTolerance option type");
    tolerance = clockTolerance;
  }
  validateInput("clockTolerance option", tolerance);
  const { currentDate } = options, now = validateInput("currentDate option", epoch(currentDate === void 0 ? /* @__PURE__ */ new Date() : currentDate)), iat = validateNumericDate(payload, "iat", maxTokenAge !== void 0), nbf = validateNumericDate(payload, "nbf");
  if (nbf !== void 0 && nbf > now + tolerance)
    throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", checkFailed);
  const exp = validateNumericDate(payload, "exp");
  if (exp !== void 0 && exp <= now - tolerance)
    throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", checkFailed);
  if (maxTokenAge !== void 0) {
    const age = now - iat, max = validateInput("maxTokenAge option", typeof maxTokenAge == "number" ? maxTokenAge : secs(maxTokenAge));
    if (age - tolerance > max)
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", checkFailed);
    if (age < -tolerance)
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", checkFailed);
  }
  return payload;
}

// artifacts/siwc-devkit/node_modules/jose/dist/webapi/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const [verified, b64] = await verifyCompact(jwt, prepareVerify(options), key);
  if (!b64)
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  const payload = validateClaimsSet(verified.protectedHeader, verified.payload, options);
  return { ...verified, payload };
}

// artifacts/siwc-devkit/node_modules/jose/dist/webapi/jwks/local.js
function isUsableJWK(jwk, entry, alg, kid) {
  const { kty, key_ops: keyOps, ext, kid: jwkKid, alg: jwkAlg, use, crv } = jwk;
  return (ext === void 0 || typeof ext == "boolean") && (keyOps === void 0 || Array.isArray(keyOps) && keyOps.every((operation, index) => typeof operation == "string" && keyOps.indexOf(operation) === index) && keyOps.includes("verify")) && entry.kty.includes(kty) && (kid === void 0 || typeof kid == "string" && kid === jwkKid) && (jwkAlg === void 0 ? kty !== "AKP" : alg === jwkAlg) && (use === void 0 || use === "sig") && (!entry.crv || crv === entry.crv);
}
async function importWithAlgCache(cache2, jwk, entry) {
  const cached = cache2.get(jwk) || cache2.set(jwk, {}).get(jwk), { alg } = entry;
  if (cached[alg] === void 0) {
    const pending = jwkToKey(entry, jwk, true).then((key) => {
      if (key.type !== "public")
        throw new JWKSInvalid("JSON Web Key Set members must be public keys");
      return cached[alg] = key, key;
    }).catch((error) => {
      throw cached[alg] === pending && delete cached[alg], error;
    });
    cached[alg] = pending;
  }
  return cached[alg];
}
function createLocalJWKSet(jwks) {
  let snapshot;
  try {
    snapshot = structuredClone(jwks);
  } catch {
  }
  if (!isJwkSet(snapshot))
    throw new JWKSInvalid("JSON Web Key Set malformed");
  const metadata = snapshot.keys.map((jwk) => {
    const normalized = snapshotJwk(jwk);
    return Array.isArray(normalized.key_ops) && (normalized.key_ops = [...normalized.key_ops]), normalized;
  }), cached = /* @__PURE__ */ new WeakMap();
  return Object.defineProperty(async (protectedHeader, token) => {
    const { alg, kid } = { ...protectedHeader, ...token?.header }, entry = typeof alg == "string" ? JWS[alg] : void 0;
    if (!entry || entry.secret)
      throw new JOSENotSupported('Unsupported "alg" value for a JSON Web Key Set');
    const candidates = snapshot.keys.filter((_, index) => isUsableJWK(metadata[index], entry, alg, kid)), { 0: jwk, length } = candidates;
    if (!length)
      throw new JWKSNoMatchingKey();
    if (length !== 1) {
      const error = new JWKSMultipleMatchingKeys();
      throw error[Symbol.asyncIterator] = async function* () {
        for (const jwk2 of candidates)
          try {
            yield await importWithAlgCache(cached, jwk2, entry);
          } catch {
          }
      }, error;
    }
    return importWithAlgCache(cached, jwk, entry);
  }, "jwks", {
    value: () => structuredClone(snapshot)
  });
}

// artifacts/siwc-devkit/node_modules/jose/dist/webapi/jwks/remote.js
function isCloudflareWorkers() {
  return typeof WebSocketPair < "u" || typeof navigator < "u" && navigator.userAgent === "Cloudflare-Workers" || typeof EdgeRuntime < "u" && EdgeRuntime === "vercel";
}
var USER_AGENT;
(typeof navigator > "u" || !navigator.userAgent?.startsWith?.("Mozilla/5.0 ")) && (USER_AGENT = "jose/v6.2.12");
var customFetch = /* @__PURE__ */ Symbol();
async function fetchJwks(url, headers, signal, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: "GET",
    signal,
    redirect: "manual",
    headers
  }).catch((err) => {
    throw err.name === "TimeoutError" ? new JWKSTimeout() : err;
  });
  if (response.status !== 200)
    throw new JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response");
  try {
    return await response.json();
  } catch {
    throw new JOSEError("Failed to parse the JSON Web Key Set HTTP response as JSON");
  }
}
var jwksCache = /* @__PURE__ */ Symbol();
function isFreshFor(timestamp, duration) {
  return Number.isFinite(timestamp) && Date.now() < timestamp + duration;
}
function validateDuration(value, fallback, option) {
  if (Number.isNaN(value))
    throw new TypeError(`"${option}" option must not be NaN`);
  return typeof value == "number" ? value : fallback;
}
function createRemoteJWKSet(url, options) {
  if (!(url instanceof URL))
    throw new TypeError("url must be an instance of URL");
  const href = new URL(url.href).href, opts = options ?? {}, timeoutOption = opts.timeoutDuration;
  if (typeof timeoutOption == "number" && (!Number.isInteger(timeoutOption) || timeoutOption < 0))
    throw new TypeError('"timeoutDuration" option must be a non-negative integer');
  const timeoutDuration = typeof timeoutOption == "number" ? timeoutOption : 5e3, cooldownDuration = validateDuration(opts.cooldownDuration, 3e4, "cooldownDuration"), cacheMaxAge = validateDuration(opts.cacheMaxAge, 6e5, "cacheMaxAge"), headers = new Headers(opts.headers);
  USER_AGENT && !headers.has("User-Agent") && headers.set("User-Agent", USER_AGENT), headers.has("accept") || headers.set("accept", "application/json, application/jwk-set+json");
  const fetchImpl = opts[customFetch], cache2 = opts[jwksCache];
  let jwksTimestamp, pendingFetch, reloadSequence = 0, appliedSequence = 0, local;
  if (cache2 && typeof cache2 == "object") {
    const { uat, jwks } = cache2;
    isFreshFor(uat, cacheMaxAge) && isJwkSet(jwks) && (jwksTimestamp = uat, local = createLocalJWKSet(jwks));
  }
  const reload = async () => {
    if (pendingFetch && isCloudflareWorkers() && (pendingFetch = void 0), !pendingFetch) {
      const sequence = ++reloadSequence, current = pendingFetch = fetchJwks(href, headers, AbortSignal.timeout(timeoutDuration), fetchImpl).then((json) => {
        const next = createLocalJWKSet(json);
        if (sequence <= appliedSequence)
          return;
        local = next;
        const updatedAt = Date.now();
        cache2 && (cache2.uat = updatedAt, cache2.jwks = json), jwksTimestamp = updatedAt, appliedSequence = sequence;
      }).finally(() => {
        pendingFetch === current && (pendingFetch = void 0);
      });
    }
    await pendingFetch;
  };
  return Object.defineProperties(async (protectedHeader, token) => {
    (!local || !isFreshFor(jwksTimestamp, cacheMaxAge)) && await reload();
    try {
      return await local(protectedHeader, token);
    } catch (err) {
      if (err instanceof JWKSNoMatchingKey && !isFreshFor(jwksTimestamp, cooldownDuration))
        return await reload(), local(protectedHeader, token);
      throw err;
    }
  }, {
    coolingDown: {
      get: () => isFreshFor(jwksTimestamp, cooldownDuration),
      enumerable: true
    },
    fresh: {
      get: () => isFreshFor(jwksTimestamp, cacheMaxAge),
      enumerable: true
    },
    reload: {
      value: reload,
      enumerable: true
    },
    reloading: {
      get: () => !!pendingFetch,
      enumerable: true
    },
    jwks: {
      value: () => local?.jwks(),
      enumerable: true
    }
  });
}

// artifacts/siwc-devkit/packages/local/src/oauth.ts
var ISSUER = "https://auth.openai.com";
var RESOURCE = "https://api.openai.com/v1";
var SCOPES = "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
var CALLBACK_PATH = "/auth/callback";
var randomValue = () => (0, import_node_crypto.randomBytes)(32).toString("base64url");
var discoveryPromise;
var keySets = /* @__PURE__ */ new Map();
async function discovery() {
  discoveryPromise ??= (async () => {
    const response = await fetchRemote(`${ISSUER}/.well-known/openid-configuration`);
    const data = await jsonResponse(response);
    if (!response.ok || !isObject(data) || data.issuer !== ISSUER) {
      throw new ChatGPTError("discovery_failed", "ChatGPT sign-in configuration could not be verified.", true);
    }
    for (const key of ["authorization_endpoint", "token_endpoint", "jwks_uri", "revocation_endpoint"]) {
      const value = data[key];
      if (key === "revocation_endpoint" && value === void 0) continue;
      if (typeof value !== "string" || new URL(value).origin !== ISSUER) {
        throw new ChatGPTError("discovery_failed", "ChatGPT sign-in configuration could not be verified.", true);
      }
    }
    return data;
  })().catch((error) => {
    discoveryPromise = void 0;
    throw error;
  });
  return discoveryPromise;
}
var identityVerificationUnavailable = () => new ChatGPTError("identity_verification_unavailable", "ChatGPT identity verification is temporarily unavailable. Your connection has been preserved. Try again shortly.", true);
async function verifyIdentity(idToken, clientId, nonce, receivedAt) {
  const config = await discovery().catch(() => {
    throw identityVerificationUnavailable();
  });
  let keys = keySets.get(config.jwks_uri);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(config.jwks_uri), {
      timeoutDuration: 15e3,
      // Classify failures at the retrieval boundary, before JOSE verifies the
      // token. An unavailable key service does not establish an invalid identity.
      [customFetch]: async (url, options) => {
        try {
          const response = await fetchRemote(url, options, 15e3);
          if (response.status !== 200) throw identityVerificationUnavailable();
          const body = await jsonResponse(response);
          if (!isObject(body) || !Array.isArray(body.keys)) throw identityVerificationUnavailable();
          return Response.json(body);
        } catch {
          throw identityVerificationUnavailable();
        }
      }
    });
    keySets.set(config.jwks_uri, keys);
  }
  try {
    const resolver = keys;
    const { payload } = await jwtVerify(idToken, async (header, token) => {
      try {
        return await resolver(header, token);
      } catch {
        if (keySets.get(config.jwks_uri) === resolver) keySets.delete(config.jwks_uri);
        throw identityVerificationUnavailable();
      }
    }, {
      issuer: config.issuer,
      audience: clientId,
      algorithms: ["RS256"],
      clockTolerance: 5,
      requiredClaims: ["iss", "aud", "exp", "iat", "sub"],
      // The encrypted checkpoint records when this response was received. An
      // outage may outlast its ID token, without invalidating its refresh token.
      ...receivedAt === void 0 ? {} : { currentDate: new Date(receivedAt) }
    });
    if (typeof payload.sub !== "string" || !payload.sub || nonce !== void 0 && payload.nonce !== nonce || payload.azp !== void 0 && payload.azp !== clientId || Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== clientId) {
      throw new Error("invalid identity");
    }
    return {
      subject: payload.sub,
      identity: {
        ...typeof payload.name === "string" ? { name: payload.name } : {},
        ...typeof payload.email === "string" ? { email: payload.email } : {}
      }
    };
  } catch (error) {
    if (error instanceof ChatGPTError && error.code === "identity_verification_unavailable") throw error;
    throw new ChatGPTError("invalid_id_token", "The ChatGPT identity could not be verified. Please sign in again.");
  }
}
async function tokenRequest(body, signal) {
  const config = await discovery();
  signal.throwIfAborted();
  const response = await fetchRemote(config.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body,
    signal
  });
  const data = await jsonResponse(response);
  if (!response.ok) throw apiError(data, response.status, response.headers.get("x-request-id"));
  if (!isObject(data)) throw new ChatGPTError("invalid_token_response", "ChatGPT returned an invalid token response. Please sign in again.");
  return data;
}
function tokenFields(data, requireRefresh = false) {
  if (typeof data.scope !== "string") {
    throw new ChatGPTError("invalid_token_response", "ChatGPT did not confirm the granted permissions. Please sign in again.");
  }
  const scopes = data.scope.split(/\s+/).filter(Boolean);
  let credentials;
  if (typeof data.access_token === "string" && data.access_token) {
    if (typeof data.token_type !== "string" || data.token_type.toLowerCase() !== "bearer" || typeof data.expires_in !== "number" || !Number.isFinite(Date.now() + data.expires_in * 1e3) || data.expires_in <= 0 || (requireRefresh || scopes.includes("offline_access")) && (typeof data.refresh_token !== "string" || !data.refresh_token)) {
      throw new ChatGPTError("invalid_token_response", "ChatGPT returned incomplete credentials. Please sign in again.");
    }
    credentials = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1e3,
      ...typeof data.refresh_token === "string" && data.refresh_token ? { refreshToken: data.refresh_token } : {},
      ...typeof data.earliest_refresh_at === "string" || typeof data.earliest_refresh_at === "number" ? { earliestRefreshAt: data.earliest_refresh_at } : {}
    };
  } else if (requireRefresh || scopes.includes("offline_access") || scopes.includes("chatgpt.tokens.use.direct")) {
    throw new ChatGPTError("invalid_token_response", "ChatGPT did not return the requested credentials. Please sign in again.");
  }
  return { scopes, ...credentials ? { credentials } : {} };
}
async function defaultOpenBrowser(url) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "rundll32" : "xdg-open";
  const args = process.platform === "win32" ? ["url.dll,FileProtocolHandler", url] : [url];
  await new Promise((resolve, reject) => {
    const child = (0, import_node_child_process.spawn)(command, args, { stdio: "ignore", shell: false });
    child.once("error", () => reject(new ChatGPTError("browser_unavailable", "The browser could not be opened. Check your default browser and try again.")));
    child.once("exit", (code) => code === 0 ? resolve() : reject(new ChatGPTError("browser_unavailable", "The browser could not be opened. Check your default browser and try again.")));
  });
}
async function listenForCallback(port, state, savedClientId, signal) {
  let complete;
  let fail;
  let settled = false;
  const result = new Promise((resolve, reject) => {
    complete = resolve;
    fail = reject;
  });
  void result.catch(() => void 0);
  let selectedPort = port;
  const finish = (value) => {
    if (settled) return;
    settled = true;
    if (value instanceof ChatGPTError) fail(value);
    else complete(value);
  };
  const script = 'history.replaceState(null, "", "/auth/complete");';
  const scriptHash = (0, import_node_crypto.createHash)("sha256").update(script).digest("base64");
  const handler = (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Security-Policy", `default-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'`);
    let url;
    try {
      url = new URL(request.url ?? "/", `http://127.0.0.1:${selectedPort}`);
    } catch {
      response.writeHead(400).end("Invalid request");
      return;
    }
    if (request.method !== "GET" || request.headers.host !== `127.0.0.1:${selectedPort}` || url.origin !== `http://127.0.0.1:${selectedPort}` || url.pathname !== CALLBACK_PATH || settled) {
      response.writeHead(404).end("Not found");
      return;
    }
    const returnedState = Buffer.from(url.searchParams.get("state") ?? "");
    const expectedState = Buffer.from(state);
    if (url.searchParams.getAll("state").length !== 1 || returnedState.length !== expectedState.length || !(0, import_node_crypto.timingSafeEqual)(returnedState, expectedState)) {
      response.writeHead(400).end("Invalid sign-in state. Return to the browser tab that started sign-in.");
      return;
    }
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Return to your app</title><style>body{font:17px system-ui;max-width:32rem;margin:18vh auto;padding:24px;color:#202123}h1{font-size:26px}</style><h1>Return to your app</h1><p>The app will finish checking your ChatGPT connection. You can close this tab.</p><script>${script}</script></html>`);
    if (url.searchParams.has("error")) {
      finish(apiError({ error: url.searchParams.get("error") }));
      return;
    }
    const code = url.searchParams.get("code");
    const returnedClientId = url.searchParams.get("client_id");
    const clientId = returnedClientId ?? savedClientId;
    if (!code || url.searchParams.getAll("code").length !== 1 || url.searchParams.getAll("client_id").length > 1 || !clientId || !/^[a-zA-Z0-9_-]{1,200}$/.test(clientId) || clientId === "dynamic_agent_client" || savedClientId !== void 0 && returnedClientId !== null && savedClientId !== returnedClientId) {
      finish(new ChatGPTError("registration_incomplete", "ChatGPT did not complete app registration. Please try signing in again."));
      return;
    }
    finish({ code, clientId });
  };
  const server = (0, import_node_http.createServer)(handler);
  server.requestTimeout = 15e3;
  server.headersTimeout = 1e4;
  const close = () => {
    signal.removeEventListener("abort", abort);
    server.close();
    server.closeAllConnections();
  };
  const abort = () => {
    finish(new ChatGPTError("cancelled", "Sign-in was cancelled."));
    close();
  };
  try {
    try {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen({ port: selectedPort, host: "127.0.0.1" }, () => {
          server.removeListener("error", reject);
          server.on("error", () => finish(new ChatGPTError("callback_failed", "The local sign-in listener stopped. Please try again.")));
          const address = server.address();
          if (address && typeof address !== "string") selectedPort = address.port;
          resolve();
        });
      });
    } catch {
      throw new ChatGPTError("callback_port_unavailable", "The sign-in port is unavailable. Close another copy of the app or choose a different redirect port.");
    }
    signal.addEventListener("abort", abort, { once: true });
    signal.throwIfAborted();
    return { result, close, redirectUri: `http://127.0.0.1:${selectedPort}${CALLBACK_PATH}` };
  } catch (error) {
    close();
    throw error;
  }
}
async function authorize(config, previous, hostId, signal, options = {}) {
  const state = randomValue();
  const nonce = randomValue();
  const verifier = randomValue();
  const provider = await discovery();
  signal.throwIfAborted();
  const listener = await listenForCallback(config.redirectPort, state, previous?.clientId, signal);
  try {
    const authorization = new URL(provider.authorization_endpoint);
    authorization.search = new URLSearchParams({
      client_id: previous?.clientId ?? "dynamic_agent_client",
      response_type: "code",
      redirect_uri: listener.redirectUri,
      scope: SCOPES,
      resource: RESOURCE,
      state,
      nonce,
      code_challenge_method: "S256",
      code_challenge: (0, import_node_crypto.createHash)("sha256").update(verifier).digest("base64url")
    }).toString();
    if (config.sendHostId) authorization.searchParams.set("ext_agent_host_id", hostId);
    if (!previous?.clientId) authorization.searchParams.set("agent_name_hint", config.appName);
    if (previous?.identity?.email) authorization.searchParams.set("login_hint", previous.identity.email);
    if (options.reconsent) authorization.searchParams.set("prompt", "consent");
    await (config.openBrowser ?? defaultOpenBrowser)(authorization.toString());
    const callback = await listener.result;
    await options.onRegistration?.(callback.clientId);
    const data = await tokenRequest(new URLSearchParams({
      grant_type: "authorization_code",
      client_id: callback.clientId,
      code: callback.code,
      code_verifier: verifier,
      redirect_uri: listener.redirectUri,
      resource: RESOURCE
    }), signal);
    if (typeof data.id_token !== "string") throw new ChatGPTError("invalid_id_token", "ChatGPT did not return a verifiable identity. Please try signing in again.");
    const identity = await verifyIdentity(data.id_token, callback.clientId, nonce);
    if (previous?.subject && identity.subject !== previous.subject) {
      throw new ChatGPTError("account_mismatch", "This sign-in returned a different ChatGPT account. Choose the original account or add a separate profile.");
    }
    signal.throwIfAborted();
    return {
      version: 1,
      clientId: callback.clientId,
      status: "connected",
      savedAt: (/* @__PURE__ */ new Date()).toISOString(),
      profileIdToken: data.id_token,
      ...identity,
      ...tokenFields(data)
    };
  } finally {
    listener.close();
  }
}
async function refreshConnection(previous, signal, persistRotation) {
  let rotation = previous.pendingRefresh;
  let fields;
  if (rotation) {
    fields = { scopes: rotation.scopes, credentials: rotation.credentials };
  } else {
    if (!previous.credentials?.refreshToken) throw new ChatGPTError("invalid_grant", "Your ChatGPT connection has expired. Sign in again.");
    const data = await tokenRequest(new URLSearchParams({
      grant_type: "refresh_token",
      client_id: previous.clientId,
      refresh_token: previous.credentials.refreshToken,
      resource: RESOURCE
    }), signal);
    fields = tokenFields({ ...data, scope: data.scope ?? previous.scopes.join(" ") }, true);
    if (data.id_token !== void 0 && (typeof data.id_token !== "string" || !data.id_token)) {
      throw new ChatGPTError("invalid_id_token", "ChatGPT returned an invalid refreshed identity. Please sign in again.");
    }
    if (typeof data.id_token === "string" && fields.credentials) {
      rotation = { credentials: fields.credentials, scopes: fields.scopes, idToken: data.id_token, receivedAt: Date.now() };
      await persistRotation(rotation);
    }
  }
  let verifiedIdentity;
  if (rotation) {
    verifiedIdentity = await verifyIdentity(rotation.idToken, previous.clientId, void 0, rotation.receivedAt);
    if (verifiedIdentity.subject !== previous.subject) throw new ChatGPTError("account_mismatch", "The refreshed ChatGPT identity does not match this profile. Sign in to the original account again.");
  }
  const { pendingRefresh: _pendingRefresh, ...verified } = previous;
  return {
    ...verified,
    ...fields,
    ...verifiedIdentity && rotation ? { ...verifiedIdentity, profileIdToken: rotation.idToken } : {},
    status: "connected",
    savedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function revokeConnection(connection) {
  if (!connection.credentials && !connection.pendingRefresh) return;
  const revocationFailed = () => new ChatGPTError("revocation_failed", "Local credentials were removed, but remote disconnection could not be confirmed. Disconnect the app in ChatGPT Settings.", true);
  const token = connection.pendingRefresh?.credentials.refreshToken ?? connection.credentials?.refreshToken;
  if (!token) throw revocationFailed();
  const provider = await discovery().catch(() => {
    throw revocationFailed();
  });
  if (!provider.revocation_endpoint) throw revocationFailed();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let retryable = false;
    try {
      const response = await fetchRemote(provider.revocation_endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token, token_type_hint: "refresh_token", client_id: connection.clientId })
      }, 1e4);
      await response.body?.cancel().catch(() => void 0);
      if (response.status === 200) return;
      retryable = response.status >= 500;
    } catch (error) {
      retryable = error instanceof ChatGPTError && error.code === "network_error";
    }
    if (!retryable || attempt === 1) break;
    await (0, import_promises.setTimeout)(300);
  }
  throw revocationFailed();
}

// artifacts/siwc-devkit/packages/local/src/responses.ts
async function streamResponse(accessToken, options, signal) {
  const input = typeof options.input === "string" ? [{ role: "user", content: options.input }] : options.input;
  if (!Array.isArray(input) || input.some(
    (message2) => !isObject(message2) || !(["user", "assistant", "developer"].includes(String(message2.role)) && (typeof message2.content === "string" || Array.isArray(message2.content)) || ["reasoning", "function_call", "function_call_output"].includes(message2.type))
  )) {
    throw new ChatGPTError("invalid_request", "Use text messages with user, assistant, or developer roles. Put system guidance in instructions.");
  }
  const response = await fetchRemote("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      accept: "text/event-stream"
    },
    body: JSON.stringify({
      model: options.model,
      input,
      ...(options.tools ? { tools: options.tools, include: ["reasoning.encrypted_content"] } : {}),
      ...options.instructions !== void 0 ? { instructions: options.instructions } : {},
      ...(options.maxOutputTokens ? { max_output_tokens: options.maxOutputTokens } : {}),
      store: false,
      stream: true
    }),
    signal
  }, 18e4);
  const requestId = response.headers.get("x-request-id");
  if (!response.ok) throw apiError(await jsonResponse(response), response.status, requestId);
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!response.body || contentType && contentType !== "text/event-stream") {
    await response.body?.cancel();
    throw new ChatGPTError("invalid_stream", "ChatGPT did not return the expected response stream.", true, response.status);
  }
  const reader = response.body.getReader();
  const decoder2 = new TextDecoder();
  let pending = "";
  let dataLines = [];
  let eventSize = 0;
  let completed = false;
  let output=[],usage=null;
  // PractiSQL compatibility: retain completed streamed items when the terminal
  // response omits its output array. This includes encrypted reasoning items.
  const streamedOutput = new Map();
  let text = "";
  const dispatch = () => {
    const data = dataLines.join("\n");
    dataLines = [];
    eventSize = 0;
    if (!data || data === "[DONE]") return;
    let event;
    try {
      event = JSON.parse(data);
    } catch {
      throw new ChatGPTError("invalid_stream", "The response stream contained an invalid event. Try again.", true);
    }
    if (!isObject(event)) return;
    if (event.type === "response.output_item.done" && Number.isSafeInteger(event.output_index) && event.output_index >= 0 && isObject(event.item)) {
      streamedOutput.set(event.output_index, event.item);
    } else if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
      text += event.delta;
      if (text.length > 16 * 1024 * 1024) throw new ChatGPTError("response_too_large", "The response was too large. Try a smaller request.");
      options.onDelta?.(event.delta);
    } else if (event.type === "response.failed" || event.type === "error") {
      const result = isObject(event.response) ? event.response : event;
      throw apiError(result, response.status, requestId);
    } else if (event.type === "response.incomplete") {
      throw new ChatGPTError("response_incomplete", "ChatGPT stopped before completing the response. You can keep the partial text or try again.", true);
    } else if (event.type === "response.completed") {
      const finalOutput=event.response?.output;
      output=Array.isArray(finalOutput)&&finalOutput.length?finalOutput:[...streamedOutput].sort((a,b)=>a[0]-b[0]).map(entry=>entry[1]);
      usage=event.response?.usage||null;
      if (!text) {
        text=output.flatMap(item=>item.content||[]).filter(part=>part.type==="output_text"&&typeof part.text==="string").map(part=>part.text).join("");
        if(text.length>16*1024*1024)throw new ChatGPTError("response_too_large", "The response was too large. Try a smaller request.");
      }
      completed = true;
    }
  };
  const line = (value) => {
    if (value === "") {
      dispatch();
      return;
    }
    if (value.startsWith("data:")) {
      const content = value.slice(5).replace(/^ /, "");
      eventSize += content.length;
      if (eventSize > 4 * 1024 * 1024) throw new ChatGPTError("invalid_stream", "ChatGPT returned an oversized stream event.");
      dataLines.push(content);
    }
  };
  try {
    for (; ; ) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      pending += decoder2.decode(chunk.value, { stream: !chunk.done });
      let consumed = 0;
      for (let index = 0; index < pending.length; index += 1) {
        const character = pending[index];
        if (character !== "\n" && character !== "\r") continue;
        if (character === "\r" && index === pending.length - 1 && !chunk.done) break;
        line(pending.slice(consumed, index));
        if (character === "\r" && pending[index + 1] === "\n") index += 1;
        consumed = index + 1;
      }
      pending = pending.slice(consumed);
      if (pending.length > 4 * 1024 * 1024) throw new ChatGPTError("invalid_stream", "ChatGPT returned an oversized stream event.");
      if (chunk.done) {
        if (pending) line(pending);
        dispatch();
        break;
      }
      if (completed) break;
    }
    if (!completed) throw new ChatGPTError("stream_interrupted", "The response ended before completion. You can keep the partial text or try again.", true);
    return { text,output,usage,status:"completed" };
  } catch (error) {
    if (signal.aborted) throw new ChatGPTError("cancelled", "The response was cancelled.");
    if (error instanceof ChatGPTError) throw error;
    throw new ChatGPTError("stream_interrupted", "The connection was interrupted. You can keep the partial text or try again.", true);
  } finally {
    await reader.cancel().catch(() => void 0);
    reader.releaseLock();
  }
}

// artifacts/siwc-devkit/packages/local/src/storage.ts
var import_node_fs = require("node:fs");
var import_promises2 = require("node:fs/promises");
var import_node_path = require("node:path");
var import_node_crypto2 = require("node:crypto");
var import_promises3 = require("node:timers/promises");
var import_proper_lockfile = __toESM(require_proper_lockfile(), 1);
var import_node_async_hooks = require("node:async_hooks");
var MAX_FILE_BYTES = 2 * 1024 * 1024;
function hasCode(error, code) {
  return error instanceof Error && "code" in error && error.code === code;
}
function validateRecord(value) {
  if (!isObject(value) || value.version !== 1 || typeof value.clientId !== "string" || !value.clientId || value.clientId === "dynamic_agent_client" || !["connected", "disconnected", "reauth_required"].includes(String(value.status)) || !Array.isArray(value.scopes) || !value.scopes.every((scope) => typeof scope === "string") || typeof value.savedAt !== "string") {
    throw new ChatGPTError("storage_invalid", "Saved ChatGPT credentials could not be read. Restore the credential file before signing in.");
  }
  if (value.subject !== void 0 && typeof value.subject !== "string") throw new ChatGPTError("storage_invalid", "Saved ChatGPT identity is invalid. Restore the credential file before signing in.");
  if (value.identity !== void 0 && (!isObject(value.identity) || value.identity.name !== void 0 && typeof value.identity.name !== "string" || value.identity.email !== void 0 && typeof value.identity.email !== "string")) {
    throw new ChatGPTError("storage_invalid", "Saved ChatGPT identity is invalid. Restore the credential file before signing in.");
  }
  if (value.credentials !== void 0 && (!isObject(value.credentials) || typeof value.credentials.accessToken !== "string" || !value.credentials.accessToken || typeof value.credentials.expiresAt !== "number" || !Number.isFinite(value.credentials.expiresAt) || value.credentials.refreshToken !== void 0 && typeof value.credentials.refreshToken !== "string")) {
    throw new ChatGPTError("storage_invalid", "Saved ChatGPT credentials are invalid. Restore the credential file before signing in.");
  }
  if (value.profileIdToken !== void 0 && (typeof value.profileIdToken !== "string" || !value.profileIdToken)) {
    throw new ChatGPTError("storage_invalid", "Saved ChatGPT identity is invalid. Restore the credential file before signing in.");
  }
  if (value.pendingRefresh !== void 0) {
    const pending = value.pendingRefresh;
    if (!isObject(pending) || value.status !== "connected" || !value.credentials || typeof pending.idToken !== "string" || !pending.idToken || typeof pending.receivedAt !== "number" || !Number.isSafeInteger(pending.receivedAt) || pending.receivedAt <= 0 || pending.receivedAt > Date.now() + 5e3 || !Array.isArray(pending.scopes) || !pending.scopes.every((scope) => typeof scope === "string") || !isObject(pending.credentials) || typeof pending.credentials.accessToken !== "string" || !pending.credentials.accessToken || typeof pending.credentials.refreshToken !== "string" || !pending.credentials.refreshToken || typeof pending.credentials.expiresAt !== "number" || !Number.isFinite(pending.credentials.expiresAt) || pending.credentials.earliestRefreshAt !== void 0 && typeof pending.credentials.earliestRefreshAt !== "string" && typeof pending.credentials.earliestRefreshAt !== "number") {
      throw new ChatGPTError("storage_invalid", "The pending ChatGPT connection is invalid. Restore the credential file before signing in.");
    }
  }
  return value;
}
function validateState(value) {
  const invalid2 = () => new ChatGPTError("storage_invalid", "Saved ChatGPT profiles could not be read. Restore the credential file before signing in.");
  if (!isObject(value) || value.version !== 2 || !Array.isArray(value.profiles) || !Array.isArray(value.pendingRegistrations)) throw invalid2();
  const entries = [...value.profiles, ...value.pendingRegistrations];
  const ids = /* @__PURE__ */ new Set();
  const labels = /* @__PURE__ */ new Set();
  for (const entry of entries) {
    if (!isObject(entry) || typeof entry.id !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(entry.id) || typeof entry.label !== "string" || !entry.label.trim() || entry.label.length > 120 || /[\u0000-\u001f]/.test(entry.label) || typeof entry.clientId !== "string" || !/^[a-zA-Z0-9_-]{1,200}$/.test(entry.clientId) || entry.clientId === "dynamic_agent_client" || typeof entry.savedAt !== "string" || ids.has(entry.id) || labels.has(entry.label)) throw invalid2();
    ids.add(entry.id);
    labels.add(entry.label);
  }
  for (const profile of value.profiles) {
    validateRecord(profile);
    if (profile.requiresNewRegistration !== void 0 && typeof profile.requiresNewRegistration !== "boolean") throw invalid2();
  }
  if (value.activeProfileId !== void 0 && (typeof value.activeProfileId !== "string" || !value.profiles.some((profile) => profile.id === value.activeProfileId))) throw invalid2();
  return value;
}
var ConnectionStore = class {
  directory;
  #filename;
  #lock;
  #hostFilename;
  #encryption;
  #context = new import_node_async_hooks.AsyncLocalStorage();
  constructor(directory, encryption) {
    if (!encryption || typeof encryption.id !== "string" || !/^[a-z0-9][a-z0-9._-]{0,99}$/.test(encryption.id) || typeof encryption.isAvailable !== "function" || typeof encryption.encrypt !== "function" || typeof encryption.decrypt !== "function") {
      throw new ChatGPTError("invalid_config", "Provide an OS-backed credential encryption provider in the local process.");
    }
    this.directory = directory;
    this.#encryption = encryption;
    this.#filename = (0, import_node_path.join)(directory, "chatgpt-auth.json");
    this.#lock = (0, import_node_path.join)(directory, ".chatgpt-auth.lock");
    this.#hostFilename = (0, import_node_path.join)(directory, "chatgpt-host.json");
  }
  async #prepare() {
    await (0, import_promises2.mkdir)(this.directory, { recursive: true, mode: 448 });
    const info = await (0, import_promises2.lstat)(this.directory);
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new ChatGPTError("storage_unsafe", "ChatGPT storage must be a private directory, not a symbolic link.");
    }
    if (process.platform !== "win32") {
      if (process.getuid && info.uid !== process.getuid()) throw new ChatGPTError("storage_unsafe", "ChatGPT storage must belong to the current user.");
      await (0, import_promises2.chmod)(this.directory, 448);
    }
  }
  async withLock(operation, signal) {
    const context = { compromised: false };
    let release;
    try {
      await this.#prepare();
      const started = Date.now();
      for (; ; ) {
        signal?.throwIfAborted();
        try {
          release = await import_proper_lockfile.default.lock(this.directory, {
            lockfilePath: this.#lock,
            stale: 12e4,
            update: 2e4,
            retries: 0,
            onCompromised: () => {
              context.compromised = true;
            }
          });
          break;
        } catch (error) {
          if (!hasCode(error, "ELOCKED")) throw error;
          if (Date.now() - started > 45e3) {
            throw new ChatGPTError("storage_busy", "Another app process is updating this ChatGPT connection. Try again shortly.", true);
          }
          await (0, import_promises3.setTimeout)(100, void 0, signal ? { signal } : {});
        }
      }
      signal?.throwIfAborted();
      const value = await this.#context.run(context, operation);
      if (context.compromised) throw new ChatGPTError("storage_lock_lost", "The credential storage lock was interrupted. Close other copies of the app and reconnect.");
      return value;
    } catch (error) {
      if (error instanceof ChatGPTError) throw error;
      if (signal?.aborted) throw new ChatGPTError("cancelled", "The request was cancelled.");
      throw new ChatGPTError("storage_error", "ChatGPT credentials could not be saved securely. Check the app's storage permissions.");
    } finally {
      if (release && !context.compromised) {
        try {
          await release();
        } catch {
          throw new ChatGPTError("storage_lock_lost", "The credential storage lock was interrupted. Close other copies of the app and reconnect.");
        }
      }
    }
  }
  #assertLocked() {
    const context = this.#context.getStore();
    if (!context || context.compromised) throw new ChatGPTError("storage_lock_lost", "The credential storage lock was interrupted. Close other copies of the app and reconnect.");
  }
  async #requireEncryption() {
    let available = false;
    try {
      available = await this.#encryption.isAvailable() === true;
    } catch {
    }
    if (!available) throw new ChatGPTError("storage_encryption_unavailable", "Secure credential storage is unavailable. Unlock your OS credential store and try again. Saved credentials have been preserved.", true);
  }
  async #readFile(filename) {
    this.#assertLocked();
    try {
      const noFollow = process.platform === "win32" ? 0 : import_node_fs.constants.O_NOFOLLOW;
      const file = await (0, import_promises2.open)(filename, import_node_fs.constants.O_RDONLY | noFollow);
      try {
        const info = await file.stat();
        if (!info.isFile() || info.size > MAX_FILE_BYTES || process.platform !== "win32" && ((info.mode & 63) !== 0 || process.getuid && info.uid !== process.getuid())) {
          throw new ChatGPTError("storage_unsafe", "Saved ChatGPT credentials must be a private, owner-only file.");
        }
        return JSON.parse(await file.readFile("utf8"));
      } finally {
        await file.close();
      }
    } catch (error) {
      if (hasCode(error, "ENOENT")) return void 0;
      if (error instanceof ChatGPTError) throw error;
      throw new ChatGPTError("storage_invalid", "Saved ChatGPT credentials could not be read. Check the app's storage permissions.");
    }
  }
  async read() {
    this.#assertLocked();
    await this.#requireEncryption();
    const value = await this.#readFile(this.#filename);
    if (value === void 0) return void 0;
    if (isObject(value) && value.version === 3) {
      if (typeof value.provider !== "string" || typeof value.ciphertext !== "string" || !value.ciphertext || Buffer.from(value.ciphertext, "base64").toString("base64") !== value.ciphertext) {
        throw new ChatGPTError("storage_encrypted_invalid", "The encrypted credential file is damaged. Restore the file before signing in. Saved credentials have been preserved.");
      }
      if (value.provider !== this.#encryption.id) {
        throw new ChatGPTError("storage_provider_mismatch", "Use the credential encryption provider that created this file. Saved credentials have been preserved.");
      }
      try {
        const plaintext = await this.#encryption.decrypt(Buffer.from(value.ciphertext, "base64"));
        if (typeof plaintext !== "string") throw new Error("Invalid decryption result");
        return validateState(JSON.parse(plaintext));
      } catch {
        throw new ChatGPTError("storage_decryption_failed", "Saved credentials could not be decrypted. Restore access to your OS credential store or restore the credential file. Saved credentials have been preserved.");
      }
    }
    if (isObject(value) && value.version === 1) {
      const connection = validateRecord(value);
      const id = (0, import_node_crypto2.randomUUID)();
      const migrated2 = {
        version: 2,
        activeProfileId: id,
        profiles: [{ ...connection, id, label: "Connection 1", requiresNewRegistration: true }],
        pendingRegistrations: []
      };
      await this.write(migrated2);
      return migrated2;
    }
    if (!isObject(value) || value.version !== 2) {
      throw new ChatGPTError("storage_encrypted_invalid", "The saved credential format is not supported. Restore the file or use the app version that created it. Saved credentials have been preserved.");
    }
    const migrated = validateState(value);
    await this.write(migrated);
    return migrated;
  }
  /** This file belongs to the runtime, independently of login/profile files. */
  async getHostId() {
    this.#assertLocked();
    await this.#requireEncryption();
    let value;
    try {
      value = await this.#readFile(this.#hostFilename);
    } catch (error) {
      if (error instanceof ChatGPTError && error.code === "storage_invalid") {
        throw new ChatGPTError("host_identity_invalid", "The saved runtime identity could not be read. Restore chatgpt-host.json before signing in.");
      }
      throw error;
    }
    if (value === void 0) {
      const id = `urn:uuid:${(0, import_node_crypto2.randomUUID)()}`;
      await this.#writeFile(this.#hostFilename, { version: 1, id });
      return id;
    }
    if (!isObject(value) || value.version !== 1 || typeof value.id !== "string" || !/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.id)) {
      throw new ChatGPTError("host_identity_invalid", "The saved runtime identity is invalid. Restore chatgpt-host.json before signing in.");
    }
    return value.id;
  }
  async write(record) {
    this.#assertLocked();
    await this.#requireEncryption();
    validateState(record);
    let ciphertext;
    try {
      ciphertext = await this.#encryption.encrypt(JSON.stringify(record));
      if (!(ciphertext instanceof Uint8Array) || ciphertext.byteLength === 0) throw new Error("Invalid encryption result");
    } catch {
      throw new ChatGPTError("storage_encryption_failed", "ChatGPT credentials could not be encrypted. Check your OS credential store and try again. Saved credentials have been preserved.", true);
    }
    await this.#writeFile(this.#filename, { version: 3, provider: this.#encryption.id, ciphertext: Buffer.from(ciphertext).toString("base64") });
  }
  async #writeFile(filename, value) {
    this.#assertLocked();
    const serialized = JSON.stringify(value);
    if (Buffer.byteLength(serialized, "utf8") > MAX_FILE_BYTES) {
      throw new ChatGPTError("storage_too_large", "The encrypted credential file exceeds the supported size. Saved credentials have been preserved.");
    }
    const temporary = (0, import_node_path.join)(this.directory, `.chatgpt-auth.${(0, import_node_crypto2.randomUUID)()}.tmp`);
    try {
      const file = await (0, import_promises2.open)(temporary, "wx", 384);
      try {
        await file.writeFile(serialized);
        await file.sync();
      } finally {
        await file.close();
      }
      this.#assertLocked();
      await (0, import_promises2.rename)(temporary, filename);
      if (process.platform !== "win32") {
        const directory = await (0, import_promises2.open)(this.directory, "r");
        try {
          await directory.sync();
        } finally {
          await directory.close();
        }
      }
    } finally {
      await (0, import_promises2.rm)(temporary, { force: true });
    }
  }
};

// artifacts/siwc-devkit/packages/local/src/index.ts
var CHATGPT_USAGE_URL = "https://chatgpt.com/settings/usage";
var SHARING_SCOPE = "chatgpt.tokens.use.direct";
var emptyState = () => ({ version: 2, profiles: [], pendingRegistrations: [] });
var selectedProfile = (saved) => saved.profiles.find((profile) => profile.id === saved.activeProfileId);
function safeSession(saved) {
  const profile = selectedProfile(saved);
  if (!profile) return { status: "disconnected", sharing: false };
  return {
    status: profile.status,
    sharing: profile.status === "connected" && Boolean(profile.credentials) && profile.scopes.includes(SHARING_SCOPE),
    profileId: profile.id,
    profileLabel: profile.label,
    ...profile.identity ? { identity: { ...profile.identity } } : {},
    ...profile.pendingRefresh ? { error: identityVerificationUnavailable().toJSON() } : {}
  };
}
function safeProfiles(saved) {
  return [
    ...saved.profiles.map((profile) => ({
      id: profile.id,
      label: profile.label,
      status: profile.status,
      sharing: profile.status === "connected" && Boolean(profile.credentials) && profile.scopes.includes(SHARING_SCOPE),
      ...profile.identity ? { identity: { ...profile.identity } } : {},
      ...profile.requiresNewRegistration ? { requiresNewRegistration: true } : {}
    })),
    ...saved.pendingRegistrations.map((entry) => ({ id: entry.id, label: entry.label, status: "disconnected", sharing: false, pending: true }))
  ];
}
function withoutCredentials(profile, status) {
  const { credentials: _credentials, profileIdToken: _idToken, pendingRefresh: _pendingRefresh, ...metadata } = profile;
  return { ...metadata, status, scopes: [], savedAt: (/* @__PURE__ */ new Date()).toISOString() };
}
function pendingConnection(pending) {
  return { version: 1, clientId: pending.clientId, status: "disconnected", scopes: [], savedAt: pending.savedAt };
}
function connectionLabel(saved, requested) {
  const used = new Set([...saved.profiles, ...saved.pendingRegistrations].map((entry) => entry.label));
  if (requested !== void 0) {
    const label = requested.trim();
    if (!label || label.length > 100 || /[\u0000-\u001f]/.test(label)) throw new ChatGPTError("invalid_config", "Use a connection label between 1 and 100 characters.");
    if (!used.has(label)) return label;
    for (let number = 2; ; number++) if (!used.has(`${label} (${number})`)) return `${label} (${number})`;
  }
  for (let number = 1; ; number++) if (!used.has(`Connection ${number}`)) return `Connection ${number}`;
}
function createChatGPT(config) {
  if (!config.appName.trim() || config.appName.length > 120 || /[\u0000-\u001f]/.test(config.appName)) throw new ChatGPTError("invalid_config", "Provide a short, human-readable app name.");
  if (!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(config.appId)) throw new ChatGPTError("invalid_config", "Use a stable app ID containing lowercase letters, digits, dots, underscores, or hyphens.");
  if (!Number.isInteger(config.redirectPort) || config.redirectPort < 0 || config.redirectPort > 65535) throw new ChatGPTError("invalid_config", "Provide a valid loopback redirect port, or 0 to select an available port.");
  if (config.storageDir && !(0, import_node_path2.isAbsolute)(config.storageDir)) throw new ChatGPTError("invalid_config", "ChatGPT storageDir must be an absolute path.");
  if (config.sendHostId !== void 0 && typeof config.sendHostId !== "boolean") throw new ChatGPTError("invalid_config", "sendHostId must be a boolean enabled only for a compatible authorization deployment.");
  const store = new ConnectionStore(config.storageDir ?? (0, import_node_path2.join)((0, import_node_os.homedir)(), ".config", config.appId), config.credentialEncryption);
  const subscribers = /* @__PURE__ */ new Set();
  const requests = /* @__PURE__ */ new Set();
  let state = { status: "disconnected", sharing: false };
  let pendingSignIn;
  let changingProfile = false;
  let epoch2 = 0;
  const snapshot = () => structuredClone(state);
  const publish = (value) => {
    state = value;
    for (const listener of subscribers) {
      try {
        listener(snapshot());
      } catch {
      }
    }
    return snapshot();
  };
  const read = () => store.withLock(async () => await store.read() ?? emptyState());
  const cancelRequests = () => {
    epoch2++;
    for (const request of requests) request.abort();
  };
  const assertIdle = () => {
    if (pendingSignIn || changingProfile) throw new ChatGPTError("connection_busy", "Finish the connection change before continuing.");
  };
  const credentialsForRequest = async (signal) => store.withLock(async () => {
    const saved = await store.read() ?? emptyState();
    let profile = selectedProfile(saved);
    if (!profile || profile.status !== "connected") throw new ChatGPTError("sign_in_required", "Sign in with ChatGPT to continue.");
    if (!profile.scopes.includes(SHARING_SCOPE)) throw new ChatGPTError("sharing_not_enabled", "You are signed in, but token sharing is disabled. Enable token sharing in your account settings to continue.");
    if (!profile.credentials) throw new ChatGPTError("sign_in_required", "Your ChatGPT connection has no usable credentials. Sign in again.");
    if (profile.pendingRefresh || profile.credentials.expiresAt <= Date.now() + 6e4) {
      const earliest = profile.credentials.earliestRefreshAt;
      const earliestMs = typeof earliest === "number" ? earliest * 1e3 : typeof earliest === "string" ? Date.parse(earliest) : 0;
      if (profile.pendingRefresh || earliestMs <= Date.now() || !Number.isFinite(earliestMs)) {
        try {
          signal.throwIfAborted();
          const refreshed = await refreshConnection(profile, AbortSignal.timeout(6e4), async (rotation) => {
            profile = { ...profile, pendingRefresh: rotation, savedAt: (/* @__PURE__ */ new Date()).toISOString() };
            saved.profiles = saved.profiles.map((entry) => entry.id === profile.id ? profile : entry);
            await store.write(saved);
          });
          profile = { ...refreshed, id: profile.id, label: profile.label, ...profile.requiresNewRegistration ? { requiresNewRegistration: true } : {} };
          saved.profiles = saved.profiles.map((entry) => entry.id === profile.id ? profile : entry);
          await store.write(saved);
        } catch (error) {
          const typed = asError(error);
          if (requiresReauthentication(typed) || ["invalid_id_token", "invalid_token_response", "account_mismatch"].includes(typed.code)) {
            const invalid2 = withoutCredentials(profile, "reauth_required");
            saved.profiles = saved.profiles.map((entry) => entry.id === invalid2.id ? invalid2 : entry);
            await store.write(saved);
          }
          throw typed;
        }
      } else if (profile.credentials.expiresAt <= Date.now()) {
        throw new ChatGPTError("refresh_not_ready", "Your ChatGPT connection cannot refresh yet. Try again shortly.", true);
      }
    }
    if (profile.credentials && profile.credentials.expiresAt <= Date.now()) {
      throw new ChatGPTError("refresh_not_ready", "Your ChatGPT connection was recovered. Try the request again to renew it.", true);
    }
    if (!profile.scopes.includes(SHARING_SCOPE)) throw new ChatGPTError("sharing_not_enabled", "You are signed in, but token sharing is disabled. Enable token sharing in your account settings to continue.");
    if (!profile.credentials) throw new ChatGPTError("sign_in_required", "Your ChatGPT connection has no usable credentials. Sign in again.");
    return { accessToken: profile.credentials.accessToken, session: safeSession(saved) };
  }, signal);
  async function authenticated(operation, callerSignal) {
    assertIdle();
    const controller = new AbortController();
    requests.add(controller);
    const signal = callerSignal ? AbortSignal.any([callerSignal, controller.signal]) : controller.signal;
    const currentEpoch = epoch2;
    try {
      const connection = await credentialsForRequest(signal);
      signal.throwIfAborted();
      if (currentEpoch !== epoch2) throw new ChatGPTError("cancelled", "The request was cancelled.");
      publish(connection.session);
      const result = await operation(connection.accessToken, signal);
      signal.throwIfAborted();
      return result;
    } catch (error) {
      const typed = asError(error);
      if (typed.code !== "cancelled" && currentEpoch === epoch2) {
        const saved = await read().catch(() => void 0);
        publish({ ...saved ? safeSession(saved) : state, error: typed.toJSON() });
      }
      throw typed;
    } finally {
      requests.delete(controller);
    }
  }
  return {
    async signIn(options = {}) {
      assertIdle();
      if (options.newProfile && options.profileId) throw new ChatGPTError("invalid_config", "Choose either a new profile or a saved profile.");
      const controller = new AbortController();
      pendingSignIn = controller;
      cancelRequests();
      const operation = epoch2;
      const signals = [controller.signal, AbortSignal.timeout(10 * 6e4)];
      if (options.signal) signals.push(options.signal);
      const signal = AbortSignal.any(signals);
      const assertCurrent = () => {
        signal.throwIfAborted();
        if (operation !== epoch2) throw new ChatGPTError("cancelled", "Sign-in was cancelled.");
      };
      publish({ ...state, status: "connecting", error: void 0 });
      try {
        const prepared = await store.withLock(async () => {
          const saved2 = await store.read() ?? emptyState();
          const id = (!options.newProfile ? options.profileId ?? saved2.activeProfileId : void 0) ?? (0, import_node_crypto3.randomUUID)();
          const profile = saved2.profiles.find((entry) => entry.id === id);
          const pending = saved2.pendingRegistrations.find((entry) => entry.id === id);
          if (options.profileId && !profile && !pending) throw new ChatGPTError("profile_not_found", "The saved ChatGPT profile could not be found.");
          if (profile?.requiresNewRegistration) throw new ChatGPTError("registration_upgrade_required", "This connection was registered with the older localhost callback. Add an account to register the new 127.0.0.1 callback. Your existing connection is preserved.");
          const label = profile?.label ?? pending?.label ?? connectionLabel(saved2, options.label);
          const hostId = await store.getHostId();
          return { id, label, profile, previous: profile ?? (pending ? pendingConnection(pending) : void 0), hostId, activeProfileId: saved2.activeProfileId };
        }, signal);
        let previous = prepared.previous;
        let issuedClientId = previous?.clientId;
        let record;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            record = await authorize(config, previous, prepared.hostId, signal, {
              reconsent: options.reconsent,
              onRegistration: async (clientId) => {
                issuedClientId = clientId;
                await store.withLock(async () => {
                  assertCurrent();
                  const saved2 = await store.read() ?? emptyState();
                  const existing = saved2.profiles.find((entry) => entry.id === prepared.id);
                  if (existing) {
                    if (!prepared.profile || existing.clientId !== clientId || existing.savedAt !== prepared.profile.savedAt || existing.credentials?.accessToken !== prepared.profile.credentials?.accessToken) {
                      throw new ChatGPTError("connection_changed", "The selected ChatGPT connection changed during sign-in. Try again.");
                    }
                    return;
                  }
                  if (prepared.profile) throw new ChatGPTError("connection_changed", "The selected ChatGPT connection changed during sign-in. Try again.");
                  const pending = saved2.pendingRegistrations.find((entry) => entry.id === prepared.id);
                  if (pending && pending.clientId !== clientId) throw new ChatGPTError("connection_changed", "The pending registration changed. Select the profile and try again.");
                  if (!pending) {
                    saved2.pendingRegistrations.push({ id: prepared.id, label: connectionLabel(saved2, prepared.label), clientId, savedAt: (/* @__PURE__ */ new Date()).toISOString() });
                    await store.write(saved2);
                  }
                }, signal);
              }
            });
            break;
          } catch (error) {
            const typed = asError(error);
            if (typed.code !== "invalid_grant" || attempt !== 0 || !issuedClientId) throw typed;
            previous ??= pendingConnection({ id: prepared.id, label: prepared.label, clientId: issuedClientId, savedAt: (/* @__PURE__ */ new Date()).toISOString() });
          }
        }
        if (!record) throw new ChatGPTError("sign_in_failed", "ChatGPT sign-in could not be completed.");
        const result = record;
        const saved = await store.withLock(async () => {
          assertCurrent();
          const latest = await store.read() ?? emptyState();
          const current = latest.profiles.find((entry) => entry.id === prepared.id);
          if (latest.activeProfileId !== prepared.activeProfileId || prepared.profile && (!current || current.savedAt !== prepared.profile.savedAt || current.credentials?.accessToken !== prepared.profile.credentials?.accessToken)) {
            throw new ChatGPTError("connection_changed", "The selected ChatGPT connection changed during sign-in. Try again.");
          }
          const pending = latest.pendingRegistrations.find((entry) => entry.id === prepared.id);
          if (pending && pending.clientId !== result.clientId) throw new ChatGPTError("connection_changed", "The pending ChatGPT registration changed. Try again.");
          const profile = { ...result, id: prepared.id, label: current?.label ?? pending?.label ?? prepared.label };
          latest.profiles = [...latest.profiles.filter((entry) => entry.id !== profile.id), profile];
          latest.pendingRegistrations = latest.pendingRegistrations.filter((entry) => entry.id !== profile.id);
          latest.activeProfileId = profile.id;
          await store.write(latest);
          return latest;
        }, signal);
        return publish(safeSession(saved));
      } catch (error) {
        const typed = asError(error);
        if (operation === epoch2) {
          const saved = await read().catch(() => emptyState());
          publish({ ...safeSession(saved), ...typed.code !== "cancelled" ? { error: typed.toJSON() } : {} });
        }
        throw typed;
      } finally {
        if (pendingSignIn === controller) pendingSignIn = void 0;
      }
    },
    cancelSignIn() {
      pendingSignIn?.abort();
    },
    async getSession() {
      if (pendingSignIn || changingProfile) return snapshot();
      try {
        const next = safeSession(await read());
        return publish({ ...next, ...state.profileId === next.profileId && state.error ? { error: state.error } : {} });
      } catch (error) {
        return publish({ status: "reauth_required", sharing: false, error: asError(error).toJSON() });
      }
    },
    async listProfiles() {
      return safeProfiles(await read());
    },
    async selectProfile(id) {
      assertIdle();
      changingProfile = true;
      cancelRequests();
      try {
        const saved = await store.withLock(async () => {
          const latest = await store.read() ?? emptyState();
          if (!latest.profiles.some((entry) => entry.id === id)) throw new ChatGPTError("profile_not_found", "The saved ChatGPT profile could not be found.");
          latest.activeProfileId = id;
          await store.write(latest);
          return latest;
        });
        return publish(safeSession(saved));
      } finally {
        changingProfile = false;
      }
    },
    subscribe(listener) {
      subscribers.add(listener);
      listener(snapshot());
      return () => {
        subscribers.delete(listener);
      };
    },
    async disconnect() {
      if (changingProfile) throw new ChatGPTError("connection_busy", "A connection change is already in progress.");
      changingProfile = true;
      cancelRequests();
      pendingSignIn?.abort();
      let revocationFailed = false;
      try {
        const saved = await store.withLock(async () => {
          const latest = await store.read() ?? emptyState();
          const profile = selectedProfile(latest);
          if (profile) {
            if (profile.credentials) {
              try {
                await revokeConnection(profile);
              } catch {
                revocationFailed = true;
              }
            }
            latest.profiles = latest.profiles.map((entry) => entry.id === profile.id ? withoutCredentials(profile, "disconnected") : entry);
            await store.write(latest);
          }
          return latest;
        });
        const error = revocationFailed ? new ChatGPTError("revocation_failed", "Local credentials were removed, but remote disconnection could not be confirmed. Disconnect the app in ChatGPT Settings.", true) : void 0;
        publish({ ...safeSession(saved), ...error ? { error: error.toJSON() } : {} });
        if (error) throw error;
      } finally {
        changingProfile = false;
      }
    },
    async listModels(options = {}) {
      return authenticated(listModels, options.signal);
    },
    async streamResponse(options) {
      if (!options.model.trim()) throw new ChatGPTError("invalid_request", "Choose a model before starting a request.");
      return authenticated((accessToken, signal) => streamResponse(accessToken, options, signal), options.signal);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CHATGPT_USAGE_URL,
  ChatGPTError,
  createChatGPT
});
// PractiSQL transport adapter: Chromium networking uses Windows trust and proxy
// settings. The upstream SDK below retains its TLS checks and OAuth validation.
const fetch = (...args) => require('electron').net.fetch(...args);
