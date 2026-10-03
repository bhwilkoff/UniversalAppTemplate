// Everything /board/ uses from React and Excalidraw, in one module, so the
// page loads one copy of React (jsDelivr's +esm builds pull in four React
// versions for Excalidraw's dependencies, and two copies of React cannot
// share a page; research/notes/board-notes.md).
export { createElement, Fragment } from 'react';
export { createRoot } from 'react-dom/client';
export {
  Excalidraw, MainMenu, CaptureUpdateAction, reconcileElements, restoreElements,
  getSceneVersion, exportToBlob, exportToSvg, serializeAsJSON
} from '@excalidraw/excalidraw';
