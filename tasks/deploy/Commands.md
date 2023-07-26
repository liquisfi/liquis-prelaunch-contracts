### Scripts

Run a particular task

```sh
yarn hardhat --config tasks-fork.config.ts <Desired_task_name>
```

e.g

```sh
yarn hardhat --config tasks-fork.config.ts deploy:mainnet:prelaunch
```

```sh
yarn hardhat --config tasks-fork.config.ts deploy:mainnet:prelaunch --network localhost
```

For mainnet deploy

```sh
yarn hardhat --config tasks.config.ts deploy:mainnet:prelaunch --network mainnet
```
