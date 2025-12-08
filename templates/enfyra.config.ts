import type { EnfyraConfig } from '@enfyra/sdk-next';

const enfyraConfig: EnfyraConfig = {
  apiUrl: process.env.ENFYRA_API_URL || 'http://localhost:1105',
  apiPrefix: '/enfyra/api',
};

export default enfyraConfig;

