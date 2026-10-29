import { runLoop } from 'D:/GitHub/dnd-cheatsheet/src/motion/engine';
import { ROW_MOTIFS } from 'D:/GitHub/dnd-cheatsheet/src/motion/rowMotifs';
import { BG_MOTIFS } from 'D:/GitHub/dnd-cheatsheet/src/motion/bgMotifs';
import { ROW_TIMING, BG_TIMING } from 'D:/GitHub/dnd-cheatsheet/src/motion/types';
(window as any).MX = { runLoop, ROW_MOTIFS, BG_MOTIFS, ROW_TIMING, BG_TIMING };
