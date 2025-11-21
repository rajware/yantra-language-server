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

const buildDist = (mode) => {
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

    Promise.all([
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
    ]).then(() => {
        console.log(`Build complete: ${mode}`);
    }).catch((err) => {
        console.error('Build failed:', err);
        process.exit(1);
    });
}

const action = process.argv[2];
switch (action) {
    case "debug":
        cleanDir('dist/');
        mkDir('dist');
        copyFiles();
        break;
    case "package":
        cleanDir('out/');
        cleanDir('dist/');
        mkDir('out');
        buildDist('release');
        break;
    case "test":
        mkDir('test');
        break;
    case "clean":
        cleanDir('out/');
        cleanDir('dist/');
        break;
    default:
        console.info('Usage: node build.js debug|package|clean');
}
