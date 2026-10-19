/* Shared window geometry. Electron display work areas are already in DIP. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PractiWindowLayout = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const reference = {width:1488, left:259, right:416};
  const interfaceScales = Object.freeze([0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5]);
  function normalizeInterfaceScale(value) {
    return typeof value === 'number' && interfaceScales.includes(value) ? value : 'auto';
  }
  function compactHD(displayBounds, scaleFactor = 1) {
    if (!displayBounds) return false;
    const scale = Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1;
    const width = displayBounds.width * scale, height = displayBounds.height * scale;
    return width >= 1344 && width <= 1376 && height >= 760 && height <= 776;
  }
  function initialZoomFactor(displayBounds, scaleFactor = 1, preference = 'auto') {
    const manual = normalizeInterfaceScale(preference);
    return manual === 'auto' ? (compactHD(displayBounds, scaleFactor) ? 0.9 : 1) : manual;
  }
  function initialWindowBounds(workArea, displayBounds = workArea, scaleFactor = 1) {
    if (!workArea || !Number.isFinite(workArea.width) || !Number.isFinite(workArea.height) || workArea.width < 1 || workArea.height < 1) {
      throw new TypeError('A positive display work area is required');
    }
    const availableWidth = Math.floor(workArea.width), availableHeight = Math.floor(workArea.height);
    // More of a small logical desktop is needed to keep text and controls usable.
    // Smooth interpolation avoids rules tied to monitor models or resolutions.
    const pressure = clamp((1 - Math.min(availableWidth / 1920, availableHeight / 1032)) / 0.4, 0, 1);
    const compact = pressure * pressure * (3 - 2 * pressure);
    const aspect = displayBounds && displayBounds.width > 0 && displayBounds.height > 0
      ? displayBounds.width / displayBounds.height : availableWidth / availableHeight;
    const tall = clamp((16 / 9 - aspect) / (16 / 9 - 4 / 3), 0, 1);
    const hd = compactHD(displayBounds, scaleFactor);
    const height = Math.max(1, Math.round(availableHeight * (hd ? 0.95 : 0.89 + 0.06 * compact)));
    const width = Math.max(1, Math.min(Math.round(availableWidth * (hd ? 0.94 : Math.min(0.94, 0.775 + 0.165 * compact + 0.13 * tall))), Math.round(height * 2.05)));
    return {
      x: Math.round((Number.isFinite(workArea.x) ? workArea.x : 0) + (availableWidth - width) / 2),
      y: Math.round((Number.isFinite(workArea.y) ? workArea.y : 0) + (availableHeight - height) / 2),
      width, height,
      minWidth: Math.min(960, width),
      minHeight: Math.min(540, height)
    };
  }
  function fitPanelWidths(preferred, viewportWidth, savedViewportWidth = reference.width) {
    const width = Math.max(1, Number(viewportWidth) || 1);
    const values = Array.isArray(preferred) ? preferred : [reference.left, reference.right];
    const basis = Number.isFinite(savedViewportWidth) && savedViewportWidth >= 320 ? savedViewportWidth : reference.width;
    const leftRatio = Number.isFinite(values[0]) ? clamp(values[0] / basis, 0, 0.45) : reference.left / reference.width;
    const rightRatio = Number.isFinite(values[1]) && values[1] > 0 ? clamp(values[1] / basis, 0.15, 0.7) : reference.right / reference.width;
    const hasLeft = leftRatio > 0;
    // Preserve all three panes even when unusually high DPI leaves very little
    // logical space. Minimums relax continuously; there is no automatic drawer.
    const minLeft = hasLeft ? Math.min(196, Math.floor(width * 0.22)) : 0;
    const minRight = Math.min(272, Math.floor(width * 0.3));
    const budget = Math.max(0, Math.floor(width - Math.min(420, width * 0.46) - (hasLeft ? 14 : 7)));
    let left = hasLeft ? Math.max(minLeft, Math.round(width * leftRatio)) : 0;
    let right = Math.max(minRight, Math.round(width * rightRatio));
    const excess = left + right - budget;
    if (excess > 0) {
      const flexible = left - minLeft + right - minRight;
      const takeLeft = flexible > 0 ? Math.round(excess * (left - minLeft) / flexible) : 0;
      left = Math.max(minLeft, left - takeLeft);
      right = Math.max(0, budget - left);
    }
    return [left, right];
  }
  return {initialWindowBounds, initialZoomFactor, fitPanelWidths, interfaceScales, normalizeInterfaceScale};
});
