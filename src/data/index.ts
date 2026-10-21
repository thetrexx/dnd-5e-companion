import classes from '../../data/classes.json';
import spells from '../../data/spells.json';
import features from '../../data/features.json';
import type { Dataset } from './types';
import { validateDataset } from './validate';

export const DATA = { classes, spells, features } as unknown as Dataset;

const errors = validateDataset(DATA);
if (errors.length > 0) throw new Error(`Invalid content data:\n${errors.join('\n')}`);
