import { cKeys } from '@/constants';
import { ExportProfilesCmd } from './impl/ExportProfilesCmd';

export default [
  new ExportProfilesCmd({ key: cKeys.exportProfiles })
];