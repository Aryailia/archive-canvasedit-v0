//Authored by Matthew King
//jQuery.sortabletabs.js
// Intended to recreate web browser like tab functionality.
//
// So terminology that I'll be using is:
// - Tab: a struct constructed by Tab_(), contains: title, head, body
// - Head: the representative object that users organize with, display title
// - HeadBar: or tab bar, the DOM element that contains the tab heads
// - Body: the actual contents of the tab
// - BodyContainer: the DOM element to which the body is appended
//
// Introduction:
// This module operates under the assumption that it is used on the tab bar.
// No knowledge of the location of the left and right buttons is assumed; Enter
// leave mouse events applied to those buttons for scrolling. It attaches the
// tab body to a container when you select a tab. The body and hence the
// the attachment method can be customized, so they don't necessarily have to be
// DOM elements. This module allows the HeadBar and BodyContainer to be
// different. Tab heads are utilize jquery-ui for to implement the drag sorting.
//
// TODO: 0 width = autofit, otherwise set width


;(function ($) {

"use strict"

function dragstart_(ui) {
  var $this = $(this);
  var helper = $this.clone();
  var tabBar = $this.parent();
  
  tabBar.data('draggable', $this);
  tabBar.data('dragging', true);
  tabBar.data('helper', helper);
  
  helper.data('helper', true);
  helper.addClass('SortableTabbing');
  $this.css('opacity', '0.0');
  
  // Assign the index to help determine whether the helper is hovering over
  // its own tab, or a diffferent tab
  var children = tabBar.children();
  for (var i = children.length - 1; i >= 0; --i) {
    children.eq(i).data('index', i * 2);
  }
  
  return helper;
}

function test() {
  //alert('ohai');
}

function release_(event, ui) {
  var bar = ui.helper.parent();
  bar.data('dragging', false);
  bar.data('draggable').css('opacity', '1.0');
}

function move_(e) {
  var bar = $(this);
  
  // Stop now if we're not dragging a tab
  if (!bar.data('dragging')) return;

  // Have to exclude the helper as it is cloned and appended to bar
  var list = bar.children().not(':data(helper)');
  var x = e.pageX - bar.offset().left;
  var y = e.pageY - bar.offset().top;
  var target = bar.data('draggable');
  var targetIndex = target.data('index');
  
  // Check for mouse collsions (mouseover) on all the tabs in the tab bar
  for (var i = list.length - 1; i >= 0; --i) {
    var invariant = list.eq(i);
    var start = invariant.position();
    var invariantIndex = invariant.data('index');
    
    if (invariantIndex != targetIndex &&
        x >= start.left && x <= (start.left + invariant.width()) &&
        y >= start.top  && y <= (start.top + invariant.height())) {
      if (targetIndex < invariantIndex) {
        invariant.after(target); // Insert the element
        target.data('index', invariantIndex + 1);
      } else {
        invariant.before(target);
        target.data('index', invariantIndex - 1);
      }
      break; // limit to only one collision possible
    }
  }
}

  function headDefault_(title) {
    var head = document.createElement('div');
    head.textContent = title;
    head.className = 'SortableTabbing-head';
    return head;
  }
  
function select_(e) {
  var bar = e.data.bar;
  var id = $(this).data('SortableTabbing_id');
  bar.sortableTabbing('select', id);
  
  var list = bar.data('SortableTabbing_List');
  bar.data('SortableTabbing_selected').call(this, e, list[id]);
}

function Tab_(bar, title) {
  var draggableArgs = {revert: true, revertDuration: 0, helper: dragstart_,
    stop: release_};
  
  var head = bar.data('SortableTabbing_head').call(this, title);
  head.style.height = bar.height() + 'px';;
  $(head).draggable(draggableArgs);
  $(head).mousedown({bar: bar}, select_);
  
  return {
    title: title,
    head: head,
    body: bar.data('SortableTabbing_body').call(this),
  }
}

// attach to container method
// create head method
// create body method
// add scrolling mouse over button
// no width limitations
function methods_(bar, name, options) {
  var tabList = bar.data('SortableTabbing_List');
  switch (name) {
  
  case 'add':
    var index = tabList.length;
    var width = bar.data('SortableTabbing_width');
    var headMaker = bar.data('SortableTabbing_head');
    var bodyMaker = bar.data('SortableTabbing_body');
    
    var tab = new Tab_(bar, options.title);
    //var tab = new Tab_(headMaker, options.title, bar.height(), bodyMaker);
    $(tab.head).data('SortableTabbing_id', index);
    
    tabList[index] = tab;
    bar.append(tab.head);
    break;
  
  case 'select':
    var bodyContainer = bar.data('SortableTabbing_bodyContainer');
    var last = tabList.length - 1;
    var activeIndex = bar.data('SortableTabbing_active');
    
    // If it's not the first tab to be added, then detach the current active tab
    
    if (activeIndex >= 0) {
      bar.data('SortableTabbing_detach').call(
        bar, bodyContainer, tabList[activeIndex].body);
    }
    
    // Find the new current tab
    activeIndex = options < 0 ? 0 : (options <= last ? options : last);
    bar.data('SortableTabbing_active', activeIndex);
    var tab = tabList[activeIndex];
    
    // Attach the new current tab
    bar.data('SortableTabbing_attach').call(bar, bodyContainer, tab.body);
    return tab.body;
    break;
  
  case 'active':
    return tabList[bar.data('SortableTabbing_active')];
    break;
  
  case 'rename':
    break;
  
  case 'delete':
    break;
  
  case 'setProperty':
    break;
  
  default:
    Console.log('SortableTabbing: no method named ' + name);
  }
  
}

function buttonEnter_(e) {
  e.data.bar.data('SortableTabbing_scrolling', true);
  e.data.scroll();
}
function buttonLeave_(e) {
  e.data.bar.data('SortableTabbing_scrolling', false);
}

// Tried intially to use mouseenter/mouseover events, but
// it wasn't firing when entering to elements before the draggable
$.fn.sortableTabbing = function(args, params) {
  // Sort out the method calls
  if (typeof args === 'string') {
    ///return this.each(function () {
      return methods_($(this), args, params);
    //});
  }
  
  // otherwise do the setup
  var options = $.extend({
    // TODO functionality
    //cancel: false,
    //connectWith: true,
    //click: function(event, elem) { },
    //helper: 'original',
    
    selected: function (e, tab) { },
    
    //bodyContainer: <- is required hence commented
    width: 120,
    left: $('<div />').text('<').get(0),
    right: $('<div />').text('>').get(0),
    head: headDefault_,
    body: function () { return document.createElement('div'); },
    swap: {
      attach: function (container, body)
        { container.appendChild(body); },
      detach: function (container, body)
        { container.removeChild(body); }
    },
  }, args);
  
  this.each(function () {
    var $this = $(this);
    $this.data('SortableTabbing_List', []);
    $this.data('SortableTabbing_width', options.width)
    $this.data('SortableTabbing_bodyContainer', options.bodyContainer);
    
    $this.data('SortableTabbing_left', options.left);
    $this.data('SortableTabbing_right', options.right);
    $this.data('SortableTabbing_head', options.head);
    $this.data('SortableTabbing_body', options.body);
    $this.data('SortableTabbing_attach', options.swap.attach);
    $this.data('SortableTabbing_detach', options.swap.detach);
    
    $this.data('SortableTabbing_selected', options.selected)
    
    $this.data('SortableTabbing_scrolling', false);
    $this.data('SortableTabbing_active', -1);
    
        
    
    var scrollL = function () {
    //  console.log('lol ' + $this.scrollLeft());
      $this.scrollLeft($this.scrollLeft() - 20);
      if ($this.data('SortableTabbing_scrolling') == true) {
        setTimeout(scrollL, 100);
      }
    }
    var scrollR = function() {
    //  console.log('orly ' + $this.scrollLeft());
      $this.scrollLeft($this.scrollLeft() + 20);
      if ($this.data('SortableTabbing_scrolling') == true) {
        setTimeout(scrollR, 100);
      }
    }
    

    $(options.left).mouseenter({ bar: $this, scroll: scrollL }, buttonEnter_);
    $(options.left).mouseleave({ bar: $this, scroll: scrollL }, buttonLeave_);
    $(options.right).mouseenter({ bar: $this, scroll: scrollR }, buttonEnter_);
    $(options.right).mouseleave({ bar: $this, scroll: scrollR }, buttonLeave_);
    $this.mousemove(move_);
  });
  return this;
};

})(jQuery);
