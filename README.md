# Sponsored fair exchange

This is the code for the sponsored fair exchange project.
This file contains some guidelines to contribute to it.

# Structure

All the code of this project is located in the `src` directory. It is structured as follows:

```
src
├── app
│   ├── api          # API endpoints, mostly for DB calls
│   ├── components   # React page components
│   ├── db           # Database and init file for it
│   ├── lib          # Code for communication with the blockchain + WASM code
│   ├── page.tsx     # Homepage
│   ├── user         # User page
│   └── more...
├── hardhat
│   ├── artifacts           # output of smart contract compilation
│   ├── contracts           # smart contracts (real, mock and test wrappers)
│   ├── deploy_libraries.ts # library deployment + compilation script
│   ├── test                # various tests of interaction with smart contracts and WASM, gas reports, ...
│   └── more...
└── wasm
    ├── deploy.sh  # compilation script for the WASM code
    ├── src        # Rust code for the WASM module
    └── more...

```

# Running

## Requirements

To run this project, you will need Node.js >= 22.13.1, npm >= 11.3.0 and sqlite3 >= 3.37.2. You will also need 
to install `tsx` and `typescript` globally:

```
  npm i -g tsx typescript
```

## Running the project

Before running the project, make sure that you have a file called `sox.sqlite` in `src/app/db`. If not,
run the following command from the project's root

```
  touch ./src/app/db/sox.sqlite
  cat ./src/app/db/init.sql | sqlite3 ./src/app/db/sox.sqlite
```

Even if the file already exists, it is recommended to run these commands, as the database may have some
data from a previous run of the application and, unless the hardhat node hasn't been turned off since,
the database won't match the blockchain's content.

Once this is done and the requirements are met, navigate to `src/hardhat` and run the following command 
(blocking)

```
  npx hardhat node
```

After that, open another terminal, navigate to `src/hardhat` again and run

```
  tsx deploy_libraries.ts
```

Wait for it to finish (it should display `Deployed!`) and then go back one level (to `src`) and run the 
following command (blocking)

```
  npm run dev
```

You should now be able to access the platform on your browser at the address `http://localhost:3000`. If not,
check on the second terminal whether a different port has been selected.

# Compiling Rust code to WASM

If you wish to make modifications to the Rust code and the wasm module, navigate to `src/wasm` and run the 
`deploy.sh` script. If you wish to deploy the code to a different path, just specify the target path as
follows:

```
  ./deploy.sh /home/user/Documents/my-cool-app-with-some-wasm
```

By default, the path will be `../app/lib/crypto_lib`, which is where the WASM binaries are stored if your
pwd is `src/wasm`.

# Running tests

The directory `src/hardhat/tests` contains a number of tests. The `.ts` files inside the `test` directory
are unit tests for the smart contract's and client data interaction. Inside `gas` are some useful tests
to run for gas estimates. `timing` contains a test (`run.ts`) which will display the time each operation
of the protocol takes.

To run any of these tests, use the following command:

```
  npx hardhat test <file>
```

IMPORTANT: These tests are written assuming that `pwd` is the same directory as the test. This is important
for some initialization which depends on a static file path. If the path is incorrect, you will get an error
that looks similar to this:

```
  Error: ENOENT: no such file or directory, open '../../../app/lib/crypto_lib/crypto_lib_bg.wasm'
    at async open (node:internal/fs/promises:638:25)
    at async readFile (node:internal/fs/promises:1242:14)
    at async main (/home/k2alamiral/project/src/hardhat/test/timing/run.ts:267:20) {
  errno: -2,
  code: 'ENOENT',
  syscall: 'open',
  path: '../../../app/lib/crypto_lib/crypto_lib_bg.wasm'
}

```
