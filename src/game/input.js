export function bindSliceInput(canvas, world, {
  addTrailPoint,
  beginSliceStroke,
  endSliceStroke,
  sliceSegment,
  onSwipe,
  onHit,
}) {
  let pointerId = null;
  let previous = null;
  let swipeSoundPlayed = false;
  let strokeStartedAt = 0;
  let lastMoveAt = 0;

  const position = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event) => {
    if (event.target.closest("button, [role='button'], .overlay") || !world.active || world.paused) return;
    event.preventDefault();
    try { window.focus(); } catch (err) { void err; }
    pointerId = event.pointerId;
    previous = position(event);
    strokeStartedAt = performance.now();
    lastMoveAt = strokeStartedAt;
    swipeSoundPlayed = false;
    beginSliceStroke(world);
    addTrailPoint(world, previous.x, previous.y);
    const result = sliceSegment(world, previous, previous);
    if (result.hits.length) onHit(result);
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (err) { void err; }
  };

  const onPointerMove = (event) => {
    if (event.pointerId !== pointerId || !previous || !world.active || world.paused) return;
    event.preventDefault();
    const next = position(event);
    const now = performance.now();
    if (now - lastMoveAt > 160) {
      endSliceStroke(world);
      beginSliceStroke(world);
      strokeStartedAt = now;
      lastMoveAt = now;
      previous = next;
      swipeSoundPlayed = false;
      addTrailPoint(world, next.x, next.y);
      return;
    }
    if (now - strokeStartedAt > 420) {
      endSliceStroke(world);
      beginSliceStroke(world);
      strokeStartedAt = now;
      swipeSoundPlayed = false;
    }
    const distance = Math.hypot(next.x - previous.x, next.y - previous.y);
    if (distance < 1) {
      lastMoveAt = now;
      return;
    }
    if (!swipeSoundPlayed && distance > 8) {
      swipeSoundPlayed = true;
      onSwipe();
    }
    addTrailPoint(world, next.x, next.y);
    const result = sliceSegment(world, previous, next);
    if (result.hits.length) onHit(result);
    previous = next;
    lastMoveAt = now;
  };

  const release = (event) => {
    if (event.pointerId !== pointerId) return;
    try {
      if (canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    } catch (err) { void err; }
    pointerId = null;
    previous = null;
    swipeSoundPlayed = false;
    strokeStartedAt = 0;
    lastMoveAt = 0;
    endSliceStroke(world);
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", release);
    canvas.removeEventListener("pointercancel", release);
  };
}
