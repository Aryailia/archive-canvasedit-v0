//Original plugin author: Ethan Atlakson
//Modified: Matthew King
//multi-selectable, multi-sortable jQuery plugin
//jQuery.multisortable.js

// TODO LIST:
// - Work on chainability for sortable (parent)
// - Implment all event handlers with eventdata instead of redefining them on
//   each chain
// - Test chainability
// - make sure everything works when selectingClass == selectedClass
// - make sure only one class is ever on anything
// - methods refresh, add, remove
// - check if works if connectedWith is invalid
(function($, undefined) {
"use strict"

$.fn.multiselectable = function(args) {
  var options = $.extend({
    click: function(event, elem) { },
    filter: '> *',
    helper: $("<div class='ui-multiselectable-helper'></div>"),
    
    selectedCursor: 'pointer',
    deselectedCursor: 'pointer',
    deselectingClass: 'ui-selecting',
    selectedClass: 'ui-selected',
    selectingClass: 'ui-selecting'
  }, args);
  var cSed = options.selectedClass;
  var cSing = options.selectingClass;
  var cDing = options.deselectingClass;

  var that = this; 
  // All connected lists
  var all = $(options.connectWith, this.parent());
  
  var methods = {
    selectclick: function($this, e) {
      //$this.select
    },
    add: function (args, dom, index) {
      var options = $.extend({
        filter: '> *',
      }, args);
      
      var $this = $(this);
      var elem = $(dom);
      var aggregate = options.connectWith ?
        $(options.connectWith, this.parent()) : $this;
      var selectees = aggregate.find(options.filter);
      var target = index ? index : selectees.length;
      
      if (target == selectees.length)
        elem.insertAfter(selectees[target - 1]);
      else
        elem.insertBefore(selectees[target]);
      
      var positions = aggregate.data('multiselectees');
      for (var i = positions.length; i > index; --i) { 
        positions[i] = positions[i - 1];
      }
      var pos = elem.offset();
      positions[target] = [elem, false,
          pos.left, pos.left + elem.outerWidth(),
          pos.top, pos.top + elem.outerHeight()];
      aggregate.data('multiselectees', positions[index]);
      
      //for (var i = positions.length;
      //console.log(positions.length);
      return this;
    },
    remove: function (args, index) {
      var options = $.extend({
        filter: '> *',
      }, args);
      
    }
  };
  
  function mousehover(e) {
    if ($(this).data('selected') && !(e.ctrlKey || e.shiftKey || e.altKey)) {
      this.style.cursor = options.selectedCursor;
    } else {
      this.style.cursor = options.deselectedCursor;
    }
  }
  
  
  if (methods[args]) {
    return methods[args].apply(this, Array.prototype.slice.call(arguments, 1));
    
  } else {
    this.each(function () {
      var $this = $(this);
      var aggregate = options.connectWith ? all : $this;
      var selectedtag = that.selector + ' ' + options.filter +  '.' + cSed;
      aggregate.data('mousedrag', false);
      aggregate.data('dragging', false);
      
      var children = $this.find(options.filter);
      var positions = aggregate.data('multiselectees') || [];
      for (var i = 0; i < children.length; ++i) {
        var child = $(children[i]);
        var pos = child.offset();
        positions.push([child, false,
          pos.left, pos.left + child.outerWidth(),
          pos.top, pos.top + child.outerHeight()]);
      }
      aggregate.data('multiselectees', positions);
      
      // Ctrl-click for toggle, shift-click for add, alt-click for remove
      children.mousedown(function(e) {
        aggregate.data('mousedrag', true);
        var $this = $(this);
        var atleastone = $(selectedtag).length > 1;
        var isSelected = $this.data('selected');
        
        var dragging = isSelected && !e.ctrlKey && !e.shiftKey && !e.altKey;
        aggregate.data('ctrl', e.ctrlKey);
        aggregate.data('shift', e.shiftKey);
        aggregate.data('shift', e.altKey);
        aggregate.data('dragging', dragging);
        if (!dragging)
          $this.data('selected', false);
        
        // Only allow removal when we have at least two selected
        if (isSelected && (e.ctrlKey || e.altKey)) {
          $this.removeClass(cSed);
          if (atleastone)
            $this.addClass(cDing).data('select', false);
          else
            $this.addClass(cSing);
        } else if (!e.altKey) {
          // Make sure sortable isn't allowed to run by removing the selected
          if (e.shiftKey || e.ctrlKey)
            $this.removeClass(cSed).addClass(cSing).data('select', true);
          
          // only add the selecting class if it's not selected already
          else if (!$this.data('select'))
            $this.addClass(cSing).data('select', true);
        }
        aggregate.data('mouseprev', $this);
        aggregate.data('opos_x', e.pageX);
        aggregate.data('opos_y', e.pageY);
        
      }).mousemove(function (e) {
        var $this = $(this);
        // Is the selection being dragged, and are we performing a drag event
        if (aggregate.data('dragging') || !aggregate.data('mousedrag'))
          return;
        
        // Only run if we actually changed element, just saves cycles
        var prev = aggregate.data('mouseprev');
        if ($this.context === prev.context)
          return;
        aggregate.data('mouseprev', $this);
        
        // Ctrl drag toggles, shift drag adds, alt drag removes
        if (aggregate.data('ctrl') || aggregate.data('shift')
           || aggregate.data('alt')) {
          var positions = aggregate.data('multiselectees');
          var ackey = e.ctrlKey || e.altKey;
          var sckey = e.ctrlKey || e.shiftKey;
          
          var x1 = aggregate.data('opos_x'), y1 = aggregate.data('opos_y');
          var x2 = e.pageX, y2 = e.pageY;
          if (x1 > x2) { var tmp = x2; x2 = x1; x1 = tmp; }
          if (y1 > y2) { var tmp = y2; y2 = y1; y1 = tmp; }
          
          var lastindex = positions.length - 1;
          // Using a for loop instead of just executing on the elements moved
          // over because sometimes mouse movement moves too fast and skips
          for (var i = lastindex; i >= 0; --i) {
            var pos = positions[i];
            var hit = (x2>=pos[2] && x1<=pos[3] && y2>=pos[4] && y1<=pos[5]);
            var wasselected = pos[1];
            
            // Make it so there's always at least one item, option?
            var selectedcount = 0;
            for (var j = lastindex; j >= 0; --j)
              { selectedcount += positions[j][0].data('select'); }
            var atleastone = selectedcount > 1;
            
            if (sckey && hit && !wasselected)
              pos[0].addClass(cSing).data('select', true);
            else if (sckey && !hit && !wasselected)
              pos[0].removeClass(cSing).data('select', false);
            else if (ackey && hit && wasselected && atleastone)
              pos[0].removeClass(cSed).addClass(cDing).data('select', false);
            else if (ackey && !hit && wasselected)
              pos[0].addClass(cSed).data('select', true);
          }
        
        // Otherwise just select only what's being hovered over for this drag
        } else {
          aggregate.find(options.filter).removeClass(cSed).removeClass(cSing)
            .data('select', false);
          $this.removeClass(cSing).addClass(cSed).data('select', true);
        }
      
      }).click(function (e) {
        aggregate.data('mousedrag', false);
        // Select only what is being hovered over
        if (!e.altKey && !e.ctrlKey && !e.shiftKey){
          aggregate.find(options.filter +  '.' + cSed)
              .removeClass(cSed).data('select', false);
          $(this).addClass(cSed).data('select', true);
        }
      }).mouseenter(mousehover)
      .mouseup(function (e) {
        if (!e.altKey && !e.ctrlKey && !e.shiftKey)
          $(this).css('cursor', options.selectedCursor);
      })
      .disableSelection();
      
      $(document).mouseup(function (e) {
        // Make the final selected or deselected class changes
        var positions = aggregate.data('multiselectees');
        if (!aggregate.data('dragging')) {
          for (var i = positions.length - 1; i >= 0; --i) {
            var $this = positions[i][0];
            positions[i][1] = $this.data('select');
            
            if ($this.data('select'))
              $this.removeClass(cSing).addClass(cSed).data('selected',true);
            else
              $this.removeClass(cDing).data('selected', false);
          }
        }
        aggregate.data('mousedrag', false);
        aggregate.data('dragging', false);
      }).keydown(function (e) {
        if (e.ctrlKey || e.shiftKey || e.altKey) {
          $this.find(options.filter).css('cursor', options.deselectedCursor);
        }
      }).keyup(function(e) {
        if (!(e.ctrlKey || e.shiftKey || e.altKey)) {
          $this.find(options.filter).filter(':data(selected)')
            .css('cursor', options.selectedCursor);
        }
      });
    });
    return this;
  }
};

$.fn.multisortable = function(args) {
  var settings = $.extend({ // What sortable accepts normally
    helperClass: 'ui-selected',
    placeholder: 'placeholder',
    selectableCursor: 'pointer',
    sortableCursor: 'move',
    
    start: function(event, ui) { },
    stop: function(event, ui) { },
    order: function(order, index, group) { }
  }, args || {});
  var optionsSelectable = $.extend({
    selectedCursor: settings.sortableCursor,
    deselectedCursor: settings.selectableCursor,
  }, args || {});
  var options = $.extend({
    filter: '> *',
  }, settings);

  this.multiselectable(optionsSelectable);
  
  function isHelper() { return $(this).data('helper'); }
  var selector = this.selector;
  var tagName = this.selector + ' ' + options.filter;
  var selectedtag = tagName + ':data(selected)';
  var all = $(options.connectWith, this.parent())
  
  this.each(function () {
    var $this = $(this);
    var aggregate = $this;//options.connectWith ? all : $this;
    
    options.cancel = tagName +':not(:data(selected))';
    
    options.cursor = settings.sortableCursor;
    
    // Save the original indices at start
    options.start = function(e, ui) {
      var sortablees = $(tagName).not(isHelper);
      var selected = $(selectedtag);
      
      for (var i = sortablees.length - 1; i >= 0; --i)
        $(sortablees[i]).data('oIndex', i);
      
      // Adjust placeholder size to be size of items
      var height = selected.length * ui.item.outerHeight();
      $(selector + ' .' + settings.placeholder).height(height);
      selected.hide(); //hide them
      
      //settings.start(e, ui);
    };
    
    //options.recieve = function () {
    //}
    
    options.stop = function (e, ui) {
      // Default behaviour if only moving one element, otherwise
      var selected = $(selectedtag);//$(tagName).filter(isSelected);
      
      if (selected.length > 1) {
        // Initial element has been moved already,
        var myIndex = ui.item.data('oIndex');
        // take all selected elements at their original positions and insert
        // them into their proper place before and after initial element
        ui.item.before(selected.filter(function () {
          return $(this).data('oIndex') < myIndex;
        }));
        ui.item.after(selected.filter(function () {
          return $(this).data('oIndex') > myIndex;
        }));
      }
      
      // Refresh ordering
      var sortablees = $(tagName);//.not(isHelper);
      selected = $(selectedtag);
      var layerIndex = sortablees.index(selected[0]);
      var groupIndex = aggregate.index(aggregate.has(selected));
      
      // Get all the original indices
      var from = [];
      for (var i = selected.length - 1; i >= 0; --i) {
        from[i] = $(selected[i]).data('oIndex');
      }
      
      settings.order(from, layerIndex, groupIndex);
      selected.show();
      settings.stop(e, ui);
    };
    
    options.helper = function (e, item) {
      var obj = $(selector)[0].cloneNode(false);
      //var sortablees = $(tagName).not(isHelper);
      var selected = $(selectedtag);
      
      for (var i = selected.length - 1; i >= 0; --i) {
        var node = selected[i].cloneNode(true);
        $(node).data('helper', true)
          .removeClass(settings.selectedClass).addClass(settings.helperClass);
        obj.appendChild(node);
      }
      $(obj).height(item.outerHeight() * selected.length);
      return obj;
    };
    
    $this.sortable(options);
  });
  return this;
};
})(jQuery);