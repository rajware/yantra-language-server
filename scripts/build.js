const fs = require('fs');
const esbuild = require('esbuild');

const cleanDir = (directoryPath) => {
    fs.rmSync(directoryPath, { recursive: true, force: true });
    console.log(`${directoryPath} and its contents are deleted!`);
}

const mkDir = (directoryPath) => {
    fs.mkdirSync(directoryPath, { recursive: false });
}

const copyFiles = () => {
    fs.copyFileSync('src/client/extension.js', 'dist/extension.js');
    fs.copyFileSync('src/server/server.js', 'dist/server.js');
    fs.cpSync('src/server/parser', 'dist/parser', { recursive: true });
}

const buildWithEsbuild = (mode) => {
    const isDebug = mode === 'debug'
    const shared = {
        bundle: true,
        platform: 'node',
        external: ['vscode'],
        sourcemap: isDebug,
        minify: !isDebug,
        target: ['node16'],
        define: {
            DEBUG: JSON.stringify(isDebug)
        }
    };

    return Promise.all([
        esbuild.build({
            ...shared,
            entryPoints: ['src/client/extension.js'],
            outfile: 'dist/extension.js',
        }),
        esbuild.build({
            ...shared,
            entryPoints: ['src/server/server.js'],
            outfile: 'dist/server.js',
        })
    ]);
}

const buildWithRollup = async (mode) => {
    const rollup = require('rollup');
    const resolve = require('@rollup/plugin-node-resolve');
    const commonjs = require('@rollup/plugin-commonjs');
    const terser = require('@rollup/plugin-terser');

    const isDebug = mode === 'debug';
    
    const sharedConfig = {
        external: ['vscode'],
        plugins: [
            resolve({
                preferBuiltins: true
            }),
            commonjs(),
            ...(!isDebug ? [terser()] : [])
        ]
    };

    const sharedOutput = {
        format: 'cjs',
        sourcemap: isDebug,
        exports: 'auto'
    };

    // Build extension
    const extensionBundle = await rollup.rollup({
        input: 'src/client/extension.js',
        ...sharedConfig
    });
    await extensionBundle.write({
        file: 'dist/extension.js',
        ...sharedOutput
    });
    await extensionBundle.close();

    // Build server
    const serverBundle = await rollup.rollup({
        input: 'src/server/server.js',
        ...sharedConfig
    });
    await serverBundle.write({
        file: 'dist/server.js',
        ...sharedOutput
    });
    await serverBundle.close();
}

const buildDist = async (mode, bundler = 'esbuild') => {
    console.log(`Building with ${bundler} in ${mode} mode...`);
    
    try {
        if (bundler === 'rollup') {
            await buildWithRollup(mode);
        } else {
            await buildWithEsbuild(mode);
        }
        console.log(`Build complete: ${mode} (${bundler})`);
    } catch (err) {
        console.error('Build failed:', err);
        process.exit(1);
    }
}

const action = process.argv[2];
const bundler = process.argv[3] || 'esbuild';

// Validate bundler option
if (bundler !== 'esbuild' && bundler !== 'rollup') {
    console.error(`Invalid bundler: ${bundler}. Use 'esbuild' or 'rollup'.`);
    process.exit(1);
}

switch (action) {
    case "debug":
        cleanDir('dist/');
        mkDir('dist');
        copyFiles();
        console.log('Debug mode: files copied (no bundling)');
        break;
    case "package":
        cleanDir('out/');
        cleanDir('dist/');
        mkDir('out');
        mkDir('dist');
        buildDist('release', bundler);
        break;
    case "test":
        mkDir('test');
        break;
    case "clean":
        cleanDir('out/');
        cleanDir('dist/');
        break;
    default:
        console.info('Usage: node build.js debug|package|clean [esbuild|rollup]');
        console.info('  debug   - Copy files without bundling');
        console.info('  package - Bundle and minify (default: esbuild)');
        console.info('  clean   - Remove build directories');
        console.info('  test    - Create test directory');
}