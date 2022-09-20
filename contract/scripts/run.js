const main = async() => {
    const [owner, randomPerson] = await hre.ethers.getSigners();
    
    const domainContractFactory = await hre.ethers.getContractFactory('Domains');
    const domainContract = await domainContractFactory.deploy("ship");
    await domainContract.deployed();

    console.log("Contract deployed to:", domainContract.address);
    console.log("Contract owner:", owner.address);

    let txn = await domainContract.register("a16z", {value: hre.ethers.utils.parseEther('1234')});
    await txn.wait();

    const balance = await hre.ethers.provider.getBalance(domainContract.address);
    console.log("Contract balance:", hre.ethers.utils.formatEther(balance));

    try {
        txn = await domainContract.connect(randomPerson).withdraw();
        await txn.wait();
    } catch(error){
        console.log("Could not rob contract");
    }

    let ownerBalance = await hre.ethers.provider.getBalance(owner.address);
    console.log("Balance of owner before withdrawal:", hre.ethers.utils.formatEther(ownerBalance));

    txn = await domainContract.connect(owner).withdraw();
    await txn.wait();

    const contractBalance = await hre.ethers.provider.getBalance(domainContract.address);
    ownerBalance = await hre.ethers.provider.getBalance(owner.address);

    console.log("Contract balance after withdrawal:", hre.ethers.utils.formatEther(contractBalance));
    console.log("Balance of owner after withdrawal:", hre.ethers.utils.formatEther(ownerBalance));

    //const address = await domainContract.getAddress("yaboi");
    //console.log("Owner of domain yaboi:", address);

    //const balance = await hre.ethers.provider.getBalance(domainContract.address);
    //console.log("Contract balance:", hre.ethers.utils.formatEther(balance));
};

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