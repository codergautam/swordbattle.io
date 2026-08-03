import * as mathgeom from './mathgeom';

export const AUTO = 0;
export const CANVAS = 1;
export const WEBGL = 2;
export const HEADLESS = 3;

export const Scale = {
  NONE: 0,
  WIDTH_CONTROLS_HEIGHT: 1,
  HEIGHT_CONTROLS_WIDTH: 2,
  FIT: 3,
  ENVELOP: 4,
  RESIZE: 5,
};

export const Math = mathgeom.Math;
export const Geom = mathgeom.Geom;
export const Display = mathgeom.Display;
export const BlendModes = mathgeom.BlendModes;
export const Utils = mathgeom.Utils;
export const Curves = mathgeom.Curves;

export const Scenes = {
  Events: {
    SHUTDOWN: 'shutdown', DESTROY: 'destroy', START: 'start', CREATE: 'create', UPDATE: 'update',
    PRE_UPDATE: 'preupdate', POST_UPDATE: 'postupdate', RENDER: 'render', SLEEP: 'sleep', WAKE: 'wake',
    PAUSE: 'pause', RESUME: 'resume', BOOT: 'boot', READY: 'ready',
  },
};
export const Loader = {
  Events: {
    COMPLETE: 'complete', PROGRESS: 'progress', START: 'start', FILE_COMPLETE: 'filecomplete',
    FILE_KEY_COMPLETE: 'filecomplete', FILE_LOAD_ERROR: 'loaderror', FILE_PROGRESS: 'fileprogress',
    ADD: 'addfile', POST_PROCESS: 'postprocess',
  },
};
