import { registerHooks } from 'node:module';

/** Resolves Vite-style extensionless TypeScript imports for native Node tests. */
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') &&
        context.parentURL?.includes('/src/')) {
        return nextResolve(specifier + '.ts', context);
      }
      throw error;
    }
  },
});
