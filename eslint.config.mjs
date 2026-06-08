import next from 'eslint-config-next';

// Next 16 removed `next lint`; eslint-config-next 16 ships a native ESLint 9+
// flat config (core-web-vitals + typescript + react/hooks/import/jsx-a11y).
const eslintConfig = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...next,
];

export default eslintConfig;
