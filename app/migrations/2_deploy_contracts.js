var SimpleStorage = artifacts.require("./SimpleStorage.sol");
var Condorcet = artifacts.require("./Condorcet.sol");

module.exports = function(deployer) {
  deployer.deploy(SimpleStorage);
  deployer.deploy(Condorcet, ['kjnsdc', 'jsndc']);
};
