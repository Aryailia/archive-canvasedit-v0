// NOTE: Will have to test if one can remove the event referenced by
//       canvasEdit_toolM? if canvasEdit_toolM? gets changed and references
//       a different function then after it is added to a layer

// All tools will be added to the layer itself as event handlers, thus the
// variable this refers to the layer itself

// include 'drawing.js'

// Consolidated to do list:
// - default tool options
// - test on big endian machine, especially the read pixel function
// - figure out where I want to paint selections
// - clean up floodfill, select, marching ants to be module functions
// - compare the outline algorithm with the rectangulate approach
// - fix every layer to be a cec
// - marching ants with zooming
"use strict";

var CanvasEditContext;
var ToolDatabase;
var CanvasEdit_ToolInterface;
var ANTS_SPACING = 8;

// Database is for shortcut keys and for a static indexing of the tools
// Tools are added in tools.js, shortcut keys in keys.js
(function () {
  function noop_ () {}

  function ToolEntry_(func, pic) {
    return {
      fn: func || _noop,
      graphic: pic || '',
    }
  }

  var codes_ = {
    'shift': 16, 'ctrl': 17, 'alt': 18,
    'tab': 9, 'delete': 46,
    'a': 65, 'b': 66, 'c': 67, 'd': 68, 'e': 69, 'f': 70,
    'g': 71, 'h': 72, 'i': 73, 'j': 74, 'k': 75, 'l': 76,
    'm': 77, 'n': 78, 'o': 79, 'p': 80, 'q': 81, 'r': 82,
    's': 83, 't': 84, 'u': 85, 'v': 86, 'w': 87, 'x': 88,
    'y': 89, 'z': 90,
    'f1': 112, 'f2': 113, 'f3': 114, 'f4': 115, 'f5': 116, 'f6': 117,
    'f7': 118, 'f8': 119, 'f9': 120, 'f10':121, 'f11':122, 'f12':123,
  }
  
  ToolDatabase = function () {
    this.pressed = [];
    this.shortcuts = {};
    this.tools = {};
  
    /**
     * Adds an entry to the tool database referenceable by a string name
     * Adding tools with a duplicate name as a previous tool will overwrite it
     * @param name - a string for the tool name
     * @param graphic - undecided format for image associated with the tool
     * @param func - the function that handles all the behaviour of the tool
     *               this should set the public methods of the class: mouseup,
     *               mousemove, mousedown, and cleanup.
     **/
    var self = this;
    document.addEventListener('keydown',
      function (e) { return down_.call(self, e); });
    document.addEventListener('keyup',
      function (e) { return up_.call(self, e); });
    return this;
  }
  
  var method = ToolDatabase.prototype;

  method.addTool = function (name, graphic, func) {
    delete this.tools[name];
    this.tools[name] = ToolEntry_(func, graphic);
  };
  
  method.useTool = function (tool, client) {
    this.tools[tool].fn.call(client);
  };
  
  // Assumes <shortcut> will be given in format with no spaces:
  // <[modifier+[modifer+[modifier]]]+letter>
  // <handler> is the function for the shortcut, event object is passed
  //
  // Current implementation allows user to redefine the three modifier keys
  // which will still be referred to as shift, ctrl, alt when adding shortcuts
  // 
  // Shorcuts are stored as string of numbers, the modifier combination (3-bit
  // number) appended after the keyCode for the letter
  method.addShortcut = function (shortcut, handler) {
    this.shortcuts[decode_(shortcut)] = handler;
  };
  
  function decode_(shortcut) {
    var keys = shortcut.split('+');
    var letter = codes_[keys.pop()];
    var mod = 0;
    for (var i = keys.length - 1; i >= 0; --i) {
      if (keys[i] == 'shift') mod += 1;
      if (keys[i] == 'ctrl')  mod += 2;
      if (keys[i] == 'alt')   mod += 4;
    }
    return letter + '' + mod;
  }
    
  method.removeShortcut = function () {
  //  delete;
  };
  
  // Executes all the added shortcuts
  // Current implementation allows user to redefine the three modifier keys
  function down_(e) {
    // Don't want to execute shortcuts on hold key down events
    if (this.pressed[e.keyCode]) {
      //console.log('holding ' + e.keyCode);
      return;
    }// else {
    
    // When a new key is pressed mark that it's been pressed
    this.pressed[e.keyCode] = true;
    
    // Execute the shortcut if it exists
    // Can preventDefault() from within the handler for the shortcut
    var list = this.shortcuts;
    switch (e.keyCode) {
      case codes_['shift']: case codes_['ctrl']: case codes_['alt']: break; 
      default:
        var mod = (e.shiftKey) + (e.ctrlKey << 1) + (e.altKey << 2);
        var key = e.keyCode + '' + mod;
        if (list[key]) list[key](e);
        break;
    }
  }
  
  function up_(e) {
    this.pressed[e.keyCode] = false;
  }
})();

(function () {
  /*****************************************************************************
   * Overlay layer wrapper construction
   ****************************************************************************/
  // Will need to be updated
  CanvasEditContext = function (actual) {
    this.actual_ = actual;
    this.pixels_ = actual.pixels;
    this.ctx_ = actual.layer.getContext('2d');
    
    this.updateDimensions(); // Sets the following three
    this.width;
    this.height;
    this.imagedata_;
  };
  /*CanvasEditContext = function (actual) {
    this.actual_ = actual;
    this.pixels_ = actual.pixels;
    this.ctx_ = actual.layer.getContext('2d');
    
    this.updateDimensions(); // Sets the following three
    this.width;
    this.height;
    this.imagedata_;
  };*/
  
  var method = CanvasEditContext.prototype;
  
  function LittleEndianTest_() {
    var a = new ArrayBuffer(4);
    var b = new Uint8Array(a);
    var c = new Uint32Array(a);
    b[0] = 0xa1;
    b[1] = 0xb2;
    b[2] = 0xc3;
    b[3] = 0xd4;
    if(c[0] == 0xd4c3b2a1) return true; // Little
    if(c[0] == 0xa1b2c3d4) return false; // Big
    throw new Error("Something crazy just happened");
  }
  
  method.updateDimensions = function () {
    var layer = this.actual_.layer;
    this.width = layer.width;
    this.height = layer.height;
    this.imagedata_ = this.ctx_.getImageData(0, 0, layer.width, layer.height);
  }
  
  // Even though this would be so much nicer to do private, but not going to
  method.update = function () {
    this.imagedata_.data.set(this.actual_.buffer);
    this.ctx_.putImageData(this.imagedata_, 0, 0);
  }
  
  method.endianTest = LittleEndianTest_;
  
  // .pixel() function
  //  Sets the rgba color of the pixel at x and y
  if (LittleEndianTest_()) {
    method.pixel = function (x, y, r, g, b, a) {
      this.pixels_[y * this.width + x] =  r | (g<<8) | (b<<16) | (a<<24);
    }
  } else {
    method.pixel = function (x, y, r, g, b, a) {
      this.pixels_[y * this.width + x] =  a | (b<<8) | (g<<16) | (r<<24);
    }
  }
  
  // .getPixel() function
  // NOTE: Probably going to scrap this, so you can deal with learning how
  //       to write your own getters. Perhaps also to help deal with memory
  //       leaks that would occur since this would return an [r, g, b, a] array
  //       and locally instancing arrays does that
  // NOTE2: Assuming Uint8ClampedArray is unaffected by endianness, inb4 not
  method.getPixel = function (x, y, r, g, b, a) {
    var i =  (y * this.width() + x) * 4;
    var buffer = this.actual_.buffer;
    return [buffer[i], buffer[i + 1], buffer[i + 2], buffer[i + 3]];
  }
  
  method.lineTo = function (x, y, thickness) {
  }
  
  // NOTE: Legacy code, to be gotten rid of, no longer doing double layer rep
  // Wrapper for the context of a canvas element in the overlay section
  // Allows both the off-screen and the display to be written to at once
  var attributes = ['fillStyle', 'canvas'];
  var methods = ['beginPath', 'closePath', 'moveTo', 'arc', 'fill', 'save',
    'restore', 'bezierCurveTo', 'stroke', 'drawImage', 'setTransform',
    'clearRect'];
  // Need to use functions since for some reason, since the array element
  // dereference doesn't propogate over to the anonymous function context when
  // in firefox, haven't tested other browsers
  function buildattributes(add) {
    CanvasEditContext.prototype[add] = function (param) {
      if (param) {
        this.ctx_[add] = param;
//      this.display_[add] = param;
      }
      return this.ctx_[add];
    }
  }
  function buildmethods(add) {
    CanvasEditContext.prototype[add] = function () {
      this.ctx_[add].apply(this.ctx_, arguments);
//      this.display_[add].apply(this.display_, arguments);
    }
  }
  for (var i = attributes.length - 1; i >= 0; --i) {
    buildattributes(attributes[i]);
  }
  for (var i = methods.length - 1; i >= 0; --i)
    buildmethods(methods[i]);
})();

(function () {
  /*****************************************************************************
   * Tool Interface
   ****************************************************************************/
  function noop_ () {}
  var cec_ = CanvasEditContext;
  
  /**
   * The constructor for this class
   * @returns this - as do most constructors
   */
  CanvasEdit_ToolInterface = function (database, overlay, canvasEdit) {
    var that = this;
    this.database = database;
    this.list = [];
    this.keys = [];
    this.v = {}; // For local variable usage for tool implementations
    this.alt = false;
    this.ctrl = false;
    this.shift = false;
    this.extra = false;
    //this.layer = canvasEdit.activeLayer; // actual layer is in 0th index
    //this.layer = [new cec_(canvasEdit.activeLayer[0])];
    this.layer = canvasEdit.activeLayer[0];
    
    this.mouseX = 0;
    this.mouseY = 0;
    //this.canvasEdit_pixelData = [];
    
    //this.bot = new cec_(canvasEdit.stratchpad);
    //this.top = new cec_(canvasEdit.sandbox);
    this.bot = canvasEdit.stratchpad;
    this.top = canvasEdit.sandbox;
    
    this.options = {};
    for (var i in database.tools) {
      this.options[i] = {}; // Initialize for all made tools
    }
    
    this.cleanup = noop_;
    this.md = noop_;
    this.mm = noop_;
    this.mu = noop_;
    
    // This causes this to be assigned to the interface
    this.mousedown = function (e) { that.md(e); };
    this.mousemove = function (e) { that.mm(e); };
    this.mouseup   = function (e) { that.mu(e); };
    
    $(overlay).mousedown(this.mousedown);
    $(overlay).mousemove(this.mousemove);
    $(overlay).mouseup(this.mouseup);
    this.selection;
    this.antsOutline = [];
    this.antsOffset = -1;
    return this;
  };
  
  var method = CanvasEdit_ToolInterface.prototype;
  
  method.updateMousePos = function (e) { 
    var obj = this.container;
    var x = e.pageX;// - this.offsetLeft;
    var y = e.pageY;// - this.offsetTop;
    
    do {
      x -= obj.offsetLeft;
      y -= obj.offsetTop;
    } while (obj = obj.offsetParent);
    
    this.mouseX = x;
    this.mouseY = y;
  };
  
  method.useTool = function (tool, options) {
    this.cleanup();
    delete this.md;
    delete this.mm;
    delete this.mu;
    if (options !== undefined) {
      this.options[tool] = options;
    }
    this.database.useTool(tool, this)
  };

  method.clear = function (cec) {
    var ctx = cec.ctx_;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // The size of width and height are the same for all layers
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  };
  
  method.width = function () {
    if (this.top.canvas().width != this.bot.canvas().width)
      console.log('Width error temp layers have different widths');
    return this.top.canvas().width;
  }
  
  method.height = function () {
    if (this.top.canvas().height != this.bot.canvas().height)
      console.log('Width error temp layers have different heights');
    return this.top.canvas().height;
  }
  
  method.copyTopDown = function () {
    this.bot.drawImage(this.top.canvas(), 0, 0)
  };
  
  // Flood Fill Stuff, preparing for selection, and later tool features
/*
  var stacknode_ = function (obj, pointer) {
    this.node = obj;
    this.prev = pointer;
  }
  var stack_ = function () {
    this.node = null;
    this.prev = null;
  };
  
  stack_.prototype.push = function (obj) {
    var pointer = this.prev;
    this.prev = this.node;
    this.node = new stacknode_(obj, pointer);
  }
  
  stack_.prototype.pop = function () {
    var obj = this.node;
    // delete this.node;
    this.node = this.prev;
    this.prev = obj.prev;
    return obj.node;
  }
*/
  
  method.selectiontestimage = function (layer, x, y) {
    var cec = new cec_(layer);
    var drawingX = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 6, 6, 7,
                    7, 8, 9,10,11,12,13,14,15,16,17,18,19,20];
    var drawingY = [20,19,18,17,16,15,14,13,12,11,10,9, 8, 7,
                    7, 6, 6, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0];
    
    // Draw face
    for (var i = drawingX.length - 1; i >= 0; --i)
      cec.pixel(drawingX[i] + x, drawingY[i] + y, 50, 200, 20, 255);
    for (var i = drawingX.length - 1; i >= 0; --i)
      cec.pixel(41 - drawingX[i] + x, drawingY[i] + y, 50, 200, 20, 255);
    for (var i = drawingX.length - 1; i >= 0; --i)
      cec.pixel(drawingX[i] + x, 41 - drawingY[i] + y, 50, 200, 20, 255);
    for (var i = drawingX.length - 1; i >= 0; --i)
      cec.pixel(41 - drawingX[i] + x, 41 - drawingY[i] + y, 50, 200, 20, 255);
    
    // Draw Left Eye
    var eyeX = [ 9, 9,10,10,11,12,13];
    var eyeY = [13,12,11,10,10, 9, 9];
    for (var i = eyeX.length - 1; i >= 0; --i)
      cec.pixel(eyeX[i] + x, eyeY[i] + y, 50, 200, 20, 255);
    for (var i = eyeX.length - 1; i >= 0; --i)
      cec.pixel(27-eyeX[i] + x, eyeY[i] + y, 50, 200, 20, 255);
    for (var i = eyeX.length - 1; i >= 0; --i)
      cec.pixel(eyeX[i] + x, 27 - eyeY[i] + y, 50, 200, 20, 255);
    for (var i = eyeX.length - 1; i >= 0; --i)
      cec.pixel(27-eyeX[i] + x,27-eyeY[i] + y, 50, 200, 20, 255);
    
    // Draw Right
    var rightX = [25,25,25,25,25,25,24,23,22];
    var rightY = [12,13,14,15,16,17,18,18,18];
    for (var i = rightX.length - 1; i >= 0; --i)
      cec.pixel(rightX[i] + x, rightY[i] + y, 50, 200, 20, 255);
    
    // Mouth
    var mouthX = [13,13,14,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29];
    var mouthY = [24,25,26,27,28,29,29,29,29,29,29,29,29,29,29,29,28,27,26];
    for (var i = mouthX.length - 1; i >= 0; --i)
      cec.pixel(mouthX[i] + x, mouthY[i] + y, 50, 200, 20, 255);
    cec.update();
    return cec;
  }

  method.selectiontestimage2 = function (layer, x, y) {
    var cec = new cec_(layer);
    var drawingX = [1,1,1,1,1,1,1,1,1,2,3,4,5,6,7,8,9,9, 9, 9, 9, 9, 9, 9, 9,
                     9, 9,10,11,12,13,14,15,15,15,15,15,15,16,17,18,19,19,19,19,
                    19,19,19,19,19,20,21,22,23,23,23,23,23,23,23,23,23,23,23,23,
                    23,23,23,23,23,23,23,22,21,20,19,18,17,16,15,14,13,12,11,10,
                     9, 8, 7, 6, 5, 4, 3, 2];
    var drawingY = [1,2,3,4,5,6,7,8,9,9,9,9,9,9,9,9,9,10,11,12,13,14,15,16,17,
                    18,19,19,19,19,19,19,19,20,21,22,23,24,24,24,24,24,24,24,24,
                    23,22,21,20,19,19,19,19,19,18,17,16,15,14,13,12,11,10, 9, 8,
                     7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                     1, 1, 1, 1, 1, 1, 1, 1];
    for (var i = drawingX.length - 1; i >= 0; --i)
      cec.pixel(drawingX[i] + x, drawingY[i] + y, 50, 200, 20, 255);
    //console.log('selectiontestimage2, drawingX.length ', drawingX.length);
    
    var lineX = [15,15,15,15,15,15,15,15];
    var lineY = [ 4, 5, 6, 7, 8, 9,10,11];
    for (var i = lineX.length - 1; i >= 0; --i)
      cec.pixel(lineX[i] + x, lineY[i] + y, 50, 200, 20, 255);
    cec.update();
    return cec;
  }
  
  // Adapted from Paul Heckbert's version in "Graphics Gems", 1990
  method.floodfill = function (layer, oldX, oldY) {
    var cec = new cec_(layer);
    var width = cec.width;
    var iMap = cec.pixels_;
    //console.log(iMap[15 * width + 11]);
    var start = oldY * width + oldX;
    var oldColor = iMap[start];
    var paintColor = 4270002850;
    
    // We're already done if the click target is the right color
    if (oldColor == paintColor)
      return;
    
    // each seed is [x1, x2, dy]
    var seedLines = [];
    seedLines.push([start, start, width]); // required for a special case
    
    // Keeping track of y value implicity in the <x1> and <x2>
    // Since all the y changes are just increments or decrements, can get by
    // by just adding the width and updating minX and minY
    var r = [start + width, start + width, -width]; // y += 1, dy = -1
    // represents the current seed line being scanned
    // initialized like this instead, instead of push/popping it
    
    // Loop through all the items in stack
    var left;
    do {
      var dy = r[2];
      var x1 = r[0] + dy, x2 = r[1] + dy;
      var minX = Math.floor(x1 / width) * width; 
      var maxX = minX + width; // Gotta use division cause of stack
      
      // Scan towards <minX> from <x1> and color till boundary hit
      var i = x1;
      for (; i >= minX && iMap[i] == oldColor; --i)
        iMap[i] = paintColor;
      
      // No change in position means <i> landed on border
      // This means the previous line just hit on the boundary of a hole
      // or this is traveling outside the boundaries of the intended fill
      if (i >= x1) { // Should be no > case
        // Find the first non-border point
        for (++i; i <= x2 && iMap[i] != oldColor; ++i) {}
        left = i;
        
        if (i > x2) // Jumping out of fill boundary in this case
          continue;
      
      // <i> is not on a border 
      } else {  
        left = i + 1; // currently is leftmost fillable pixel
        if (left < x1) // Leaked towards <minX>
          seedLines.push([left, x1 - 1, -dy]); // Backtrack over new region
        
        i = x1 + 1; // <left> to <x1> already filled
      }
      
      // Non-fillables break up the seedline for the next loop
      // By doing this it ensures holes arent filled because it shifts <x2>
      // till the boundary point when encountering a hole, while still moving
      // past obstructions.
      do {
        // Scan right until non-fillable
        for (; i <= maxX && iMap[i] == oldColor; ++i)
          iMap[i] = paintColor;
        seedLines.push([left, i - 1, dy]);
        
        if (i - 1 > x2)  // Leaked towards <maxX>
          seedLines.push([x2 + 1, i - 1, -dy]); // Backtrack over rew region
        
        // Navigate past the border, the non-fillable
        for (++i; i <= x2 && iMap[i] != oldColor; ++i) {}
        left = i;
        // Rerun loop starting after that border and until x2
      } while (i <= x2);
    } while (r = seedLines.pop());
    cec.update();
    //return iMap.clone();
  }
  
  // As much as I would like to make this into a more functional approach of
  // finding the corners and building the segements from that static amount, I
  // don't think it'll be more efficient in Javascript
  //
  // Probably best idea is to build <indexedList> up as a heap while adding
  // elements to it, and do heapsort. Plus heaps can be represented by arrays
  function segmentJoin_(list, check, dir, indexFunc) {
    // Index each point in <list> by their either x- or y- direction depending
    // on <dir>. Top and Bot are indexed by their y's, Left and Right by x's
    var indexedList = {};
    for (var i = list.length - 1; i >= 0; --i) {
      var p = list[i];
      var x = indexFunc(p);
      if (indexedList[x] === undefined)
        indexedList[x] = [];
      indexedList[x].push(p);
    }
    
    // Join pixels that share the same index, ensuring they form a line
    // NOTE: order reversed
    var segments = [];
    var k = -1; // index for <segments>, just the last entry of <segments>
    for (var i in indexedList) {
      var points = indexedList[i].sort(function (a, b) { return a - b; });
      var n = points.length - 2;
      segments[++k] = [points[n + 1]]; // start new segment with new array
      
      var j = 0; // Index for the new line segment being pushed into <segments>
      for (; n >= 0; --n) {
        var line = segments[k];
        // If unbroken line keep adding building up <line>, else start new
        if (line[j] - points[n] == dir) { line.push(points[n]); ++j; }
        else {                            segments[++k] = [points[n]]; j = 0; }
      }
    }
    
    // Extends each segment to include convex corners, which are missed by
    // following pixels that are in the interior instead of vertices
    var t = 0;
    for (var i = segments.length - 1; i >= 0; --i) {
      var line = segments[i];     // <dir> is always positive
      var before = line[0] + dir; // Add because sorted in reverse
      var after =  line[line.length - 1] - dir; // Likewise you subtract
      if (check(before)) { line.unshift(before); }
      if (check(after))  { line.push(after); }
    }
    return segments;
  }
    
  // <orientation> true means concave (270), false means convex (90)
  // concave turn clockwise, convex turn counter clockwise
  // [[0, -1], [1, 0]] <- clockwise, cause images suck
  function rotate_(orientation, dir, width) {
    var mag = Math.abs(dir);
    var sign = dir / mag;
    var d = mag == 1 ? [sign, 0] : [0, sign]; // [x, y]
    return orientation ? width * d[0] - d[1]: d[1] - width * d[0];
  }
  
  // This reminds of something I did in rectangulation, longest augmented path
  // NOTE: Splice while this stuff is in head does interesting things to
  //       console.log and prints the final result rather than at real time
  //
  // First entry is guarenteed to have the largest outline because it starts
  // with the lowest y, then lowest x value, then draws the outline of that
  // which is guarenteed to lie on the convex hull of the selection
  //
  // The marching ants that demarcates the selection are represented by paths of
  // pixels located on the interior of the selection as are holes
  //
  // TODO: Write a trace method similar to the DNA Rectangulate method
  // and strength test
  method.select = function (mask, width) {
    if (width <= 0) return;
    
    var color = 4270002850;
    var left = [];
    var right = [];
    var top = [];
    var bot = [];
    var w = width;
    
    // First determin and tag pixels that lie on the edge
    //
    // Important to seperate top from bottom and left from right because it
    // prevents the overlap caused by two sides of the marching ants from
    // sharing a pixel eg. two squares overlapping one pixel at a corner
    for (var i = mask.length - 1; i >= 0; --i) {
      if (mask[i] == color) {
        if (mask[i - 1] != color)     { left.push(i); }
        if (mask[i - width] != color) { top.push(i); }
        if (mask[i + 1] != color)     { right.push(i); }
        if (mask[i + width] != color) { bot.push(i); }
      }
    }
    
    
    
    // Now join the pixels together to form line segments
    // Segments are grown to include corners that they pass
    var check = function (p) { return mask[p] == color; }
    var hSort = function (p) { return Math.floor(p / width); }
    var vSort = function (p) { return p % width; }
    
    // Note: h.length <=> v.length because selection is an orthogonal polygon
    //       Additionally, this is a bipartide list of horizontal and vertical
    var h = segmentJoin_(top, check, 1, hSort, mask)
      .concat(segmentJoin_(bot, check, 1, hSort, mask));
    var v = segmentJoin_(left, check, width, vSort, mask)
      .concat(segmentJoin_(right, check, width, vSort, mask));
    
    
    
    // Now join the segments into paths
    var outline = [v.pop()];
    var p = 0; // Parity to show which direction array to use
    var segs = [h, v];
    var x = 0;  // Index for <outline> for which path we're tracing
    
    // Now join all the segments
    for (var i = h.length + v.length - 1; i >= 0; --i) {
      var path = outline[x];
      
      //for (var j = segs[p].length - 1; j >= 0; --j) {
      for (var j = segs[p].length - 1; j >= 0; --j) {
        
        var tail = path[path.length - 1]; // end of the current path traced
        var dir = tail - path[path.length - 2];
        dir = rotate_(check(tail + dir), dir, width);
        var next = tail + dir;
        
        var line = segs[p][j];
        var last = line.length - 1;
        
        // Appropriate lines will share corners, thus check start or end
        // and also make sure the direction is correct for the fringe cases
        if (tail == line[0] && next == line[1]) {
            line.shift();         // First element is a duplicate
            outline[x] = outline[x].concat(line);
            segs[p].splice(j, 1); // Remove from v or h
            p = (p + 1) % 2;      // Now look in other orientated v or h
            break;
        } else if (tail == line[last] && next == line[last - 1]) {
            line.pop();           // Last element is a duplicate
            outline[x] = outline[x].concat(line.reverse());
            segs[p].splice(j, 1); // Remove from v or h
            p = (p + 1) %2;       // Now look in other orientated v or h
            break;
        }
      }
      
      // If we've arrived back at the start, then one path is completed, then
      // move to covering holes and drawing the next path around them 
      if (path[0] == path[path.length - 1]  && v.length > 0) {
        path.pop(); // Remove that repeat
        outline[++x] = v.pop();
        // To be an orthogonal polygon, it had to close on a horizontal
        // since we started on vertical, and we're starting on vertical again
        p = 0;
      }
    }
    return outline;
  }
  
  method.startAnts = function (layer, oldX, oldY) {
    this.selectiontestimage(layer, 2, 2);
    //this.selectiontestimage2(layer, 2, 2);
    this.selection = this.floodfill(layer, oldX, oldY);
    
    var cec = new cec_(layer);
    this.selectionLayer = cec;
    this.antsOutline = this.select(cec.pixels_, cec.width, cec);
    /*for (var i = this.antsOutline.length - 1; i >= 0; --i) {
      var path = this.antsOutline[i]; 
      for (var j = path.length - 1; j >= 0; --j) {
        cec.pixels_[path[j]] = 4278190080;
      }
    }
    cec.update();
    // */
    
    this.antsOffset = 0;
    this.marchingAnts();
  }
  
  method.marchingAnts = function () {
    // 4278190080 <=> FF000000 is black
    var iMap = this.selectionLayer.pixels_;
    for (var i = this.antsOutline.length - 1; i >= 0; --i) {
      var path = this.antsOutline[i];
      var limit = ANTS_SPACING % path.length;
      var d = this.antsOffset % limit;
      for (var j = path.length - 1; j >= 0; j -= limit) {
        iMap[path[j - d]]     = 4278190080;
        iMap[path[j - 1 - d]] = 4278190080;
        iMap[path[j - 2 - d]] = 4278190080;
        
        
        iMap[path[j - 3 - d]] = 4294967295;
        iMap[path[j - 4 - d]] = 4294967295;
        iMap[path[j - 5 - d]] = 4294967295;
        iMap[path[j - 6 - d]] = 4294967295;
        iMap[path[j - 7 - d]] = 4294967295;
      }
    }
    this.selectionLayer.update();
    
    var that = this;
    if (this.antsOffset >= 0) {
      this.antsOffset = (this.antsOffset + 1) % ANTS_SPACING;
      console.log(this.antsOffset);
      setTimeout(function () { that.marchingAnts() }, 1000);
    }
  }
})();