import classes from '../../data/classes.json';
import subclasses from '../../data/subclasses.json';
import optionGroups from '../../data/options.json';
import races from '../../data/races.json';
import feats from '../../data/feats.json';
import spells from '../../data/spells.json';
import type { Dataset, Feature } from './types';
import { validateDataset } from './validate';

const files = import.meta.glob('../../data/features/*.json', { eager: true, import: 'default' }) as Record<string, Feature[]>;
const features = Object.keys(files).sort().flatMap(k => files[k]);

export const DATA = { classes, subclasses, optionGroups, races, feats, spells, features } as unknown as Dataset;

const errors = validateDataset(DATA);
if (errors.length > 0) throw new Error(`Invalid content data:\n${errors.join('\n')}`);
