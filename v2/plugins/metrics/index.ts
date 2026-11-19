import { Plugin } from '@opencode/plugin';
import { register } from './native.mjs';
export default Plugin.define({ id: 'opencode-ticketing.metrics', setup: register });
