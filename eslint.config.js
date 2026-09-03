import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/pages/AttendanceManagementPage.tsx'],
    rules: {
      // The page's effects call async data loaders that await network requests before updating state.
      // react-hooks/set-state-in-effect conservatively traces those helper calls as synchronous.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
