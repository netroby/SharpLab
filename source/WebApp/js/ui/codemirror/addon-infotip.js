(function(mod) {
  if (typeof exports === "object" && typeof module === "object") // CommonJS
    mod(require("codemirror"));
  else if (typeof define === "function" && define.amd) // AMD
    define(["codemirror"], mod);
  else // Plain browser env
    mod(window.CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var tooltip = (function() {
    var element;
    var ensureElement = function() {
      if (element)
        return;
      element = document.createElement("div");
      element.className = "CodeMirror-infotip cm-s-default"; // TODO: dynamic theme based on current cm
      element.setAttribute("hidden", "hidden");
      CodeMirror.on(element, "click", function() { tooltip.hide(); });
      document.getElementsByTagName("body")[0].appendChild(element);
    };

    return {
      show: function(content, left, top, altBottom) {
        if (!this.active)
          ensureElement();

        element.innerHTML = content;
        element.style.transform = `translate(${left}px, ${top}px)`;
        if (!this.active) {
          element.removeAttribute("hidden");
          // Note: we have to show it *before* we check for a better position
          // otherwise we can't calculate the size
        }

        const rect = element.getBoundingClientRect();
        const betterLeft = (rect.right <= window.innerWidth) ? left : (left - (rect.right - window.innerWidth));
        const betterTop = (rect.bottom <= window.innerHeight) ? top : (altBottom - rect.height);
        if (betterLeft !== left || betterTop !== top)
          element.style.transform = `translate(${betterLeft}px, ${betterTop}px)`;

        this.active = true;
        this.content = content;
      },

      hide: function() {
        if (!this.active || !element)
          return;
        element.setAttribute("hidden", "hidden");
        this.active = false;
      }
    };
  })();

  function mousemove(e) {
    /* eslint-disable no-invalid-this */
    delayedInteraction(this.CodeMirror, e.pageX, e.pageY);
  }

  function mouseout(e) {
    /* eslint-disable no-invalid-this */
    var cm = this.CodeMirror;
    if (e.target !== cm.getWrapperElement())
      return;
    tooltip.hide();
  }

  function touchstart(e) {
    /* eslint-disable no-invalid-this */
    delayedInteraction(this.CodeMirror, e.touches[0].pageX, e.touches[0].pageY);
  }

  function click(e) {
    /* eslint-disable no-invalid-this */
    interaction(this.CodeMirror, e.pageX, e.pageY);
  }

  var activeTimeout;
  function delayedInteraction(cm, x, y) {
    /* eslint-disable no-invalid-this */
    if (activeTimeout) {
      clearTimeout(activeTimeout);
    }

    activeTimeout = setTimeout(function() {
      interaction(cm, x, y);
      activeTimeout = null;
    }, 100);
  }

  function interaction(cm, x, y) {
    var coords = cm.coordsChar({ left: x, top: y });
    var getTipContent = cm.state.infotip.getTipContent || cm.getHelper(coords, "infotip");
    if (!getTipContent) {
      tooltip.hide();
      return;
    }

    var token = cm.getTokenAt(coords);
    // this means that we are actually beyond the token, e.g.
    // coordsChar() to the right of eol still returns last char
    // on the line, but xRel will be 1 (to the right)
    if (token.end === coords.ch && coords.xRel === 1) {
      tooltip.hide();
      return;
    }
    if (token === tooltip.token)
      return;

    tooltip.token = token;
    var content = getTipContent(cm, token);
    if (content == null) {
      tooltip.hide();
      return;
    }

    if (tooltip.active && content === tooltip.content)
      return;
    const tokenStart = cm.cursorCoords(CodeMirror.Pos(coords.line, token.start));
    tooltip.show(content, tokenStart.left, tokenStart.bottom, tokenStart.top);
  }

  CodeMirror.defineOption("infotip", null, function(cm, options, old) {
    var wrapper = cm.getWrapperElement();
    var state = cm.state.infotip;
    if (old && old !== CodeMirror.Init && state) {
      CodeMirror.off(wrapper, "click",      click);
      CodeMirror.off(wrapper, "touchstart", touchstart);
      CodeMirror.off(wrapper, "mousemove",  mousemove);
      CodeMirror.off(wrapper, "mouseout",   mouseout);
      delete cm.state.infotip;
    }

    if (!options)
      return;

    state = {
      getTipContent: options.getTipContent
    };
    cm.state.infotip = state;
    CodeMirror.on(wrapper, "click",      click);
    CodeMirror.on(wrapper, "touchstart", touchstart);
    CodeMirror.on(wrapper, "mousemove",  mousemove);
    CodeMirror.on(wrapper, "mouseout",   mouseout);
  });
});