const main = async () => {
    console.log("Getting contract factory...");
    const domainContractFactory = await hre.ethers.getContractFactory('Domains');
    console.log("Deploying contract...");
    const domainContract = await domainContractFactory.deploy("ship");
    await domainContract.deployed();
  
    console.log("Contract deployed to:", domainContract.address);
  
    let txn = await domainContract.register("helloworld",  {value: hre.ethers.utils.parseEther('0.1')});
    await txn.wait();
    console.log("Minted domain helloworld.ship");
  
    txn = await domainContract.setRecord("helloworld", "First");
    await txn.wait();
    console.log("Set record for helloworld.ship");
  
    const address = await domainContract.getAddress("helloworld");
    console.log("Owner of domain helloworld:", address);
  
    const balance = await hre.ethers.provider.getBalance(domainContract.address);
    console.log("Contract balance:", hre.ethers.utils.formatEther(balance));
  }
  
  const runMain = async () => {
    try {
      await main();
      process.exit(0);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  };
  
  runMain();