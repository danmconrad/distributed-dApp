import React, { Component } from "react";
import contract from "truffle-contract";
import CondorcetDefinition from "../../../build/contracts/Condorcet.json";
import { computeWinnerIndex } from "../../utils/algos";

import styles from "./Poll.css";


class Poll extends Component {
  state = {
    candidates: [],
    contract: null,
    error: null,
    hasVoted: false,
    isSubmitting: false,
    votes: [],
    winnerIndex: null
  };

  componentDidMount = () => {
    this.fetchContract()
      .then(() => this.fetchAccount())
      .then(() => this.fetchCandidates())
      .then(() => this.listenForChanges())
  };

  fetchAccount = () => {
    return new Promise((resolve, reject) => {
      this.props.web3.eth.getAccounts((error, accounts) => {
        if (error) {
          return reject(error);
        }
        this.setState({ account: accounts[0] }, resolve);
      });
    });
  };

  fetchContract = () => {
    const { web3 } = this.props;
    const Condorcet = contract(CondorcetDefinition);
    Condorcet.setProvider(web3.currentProvider);

    return new Promise((resolve, reject) => {
      Condorcet.deployed()
        .then(contract => this.setState({ contract }, resolve))
        .catch(reject);
    });
  };

  fetchCandidates = () => {
    this.state.contract
      .candidates()
      .then(candidates => candidates.map(this.candidateFromHex))
      .then(candidates => this.setState({ candidates }))
      .catch(err => console.log(err));
  };

  listenForChanges = () => {
    this.state.contract.StateUpdate({}, {fromBlock: 0, toBlock: 'latest'})
      .watch(this.handleStateUpdate);
  };

  handleStateUpdate = (error, results) => {
    if (error) {
      return this.setState({ error });
    }

    const cleanedFlatMatrix = results.args.stateMatrix.map(el => el.toNumber());
    const numCandidates = results.args.numCandidates.toNumber();
    const winnerIndex = computeWinnerIndex(cleanedFlatMatrix, numCandidates);

    this.setState({ winnerIndex });
  };

  getWinner = () => {
    const { winnerIndex, candidates } = this.state;
    return winnerIndex >= 0 && candidates[winnerIndex];
  };

  candidateFromHex = c => {
    const name = this.props.web3.toAscii(c);
    return { id: name, name };
  };

  candidatesNotYetVotedFor = () => {
    return this.state.candidates.filter(c => {
      return this.state.votes.indexOf(c) < 0
    });
  };

  addCandidate = candidate => {
    this.setState({
      votes: [...this.state.votes, candidate]
    });
  };

  removeCandidate = candidate => {
    this.setState({
      votes: this.state.votes.filter(c => c !== candidate)
    });
  };

  canSubmit = () => {
    const { votes, candidates } = this.state;
    return !this.state.hasVoted && votes.length > 0 && votes.length === candidates.length;
  };

  submitVote = () => {
    if (this.state.isSubmitting) {
      return;
    }

    this.setState({ isSubmitting: true });

    this.state.contract
      .castVote(this.voteRanking(), { from: this.state.account })
      .then(() => this.setState({ hasVoted: true, isSubmitting: false}))
      .catch(error => this.setState({ error, isSubmitting: false }));
  };

  voteRanking = () => {
    return this.state.candidates.map(c => this.state.votes.indexOf(c));
  };

  render() {
    const availableCandidates = this.candidatesNotYetVotedFor();
    const winner = this.getWinner();

    return (
      <div className={styles.Poll}>
        {availableCandidates.length > 0 &&
          <div>
            <h2>Make your choices</h2>
            <p>Select the candidates in the order you prefer.</p>
            <div className={styles.candidates}>
              {availableCandidates.map(candidate => (
                <button 
                  key={candidate.id} 
                  className="pure-button"
                  onClick={() => this.addCandidate(candidate)}
                >
                  {candidate.name}
                </button>
              ))}
            </div>
          </div>
        }

        {this.state.votes.length > 0 && <h2>Your choices</h2>}
        <div>
          {this.state.votes.map((candidate, i) => (
            <button 
              key={candidate.id} 
              className="pure-button"
              onClick={() => this.removeCandidate(candidate)}
            >
              <span className={styles.buttonNumber}>#{i+1}</span> 
              {candidate.name} 
              <i className="far fa-times-circle"></i>
            </button>
          ))}
        </div>

        <div className={styles.submitSection}>
          {this.canSubmit() &&
            <button 
              disabled={this.state.isSubmitting}
              className={`${this.state.isSubmitting && styles.submitting} pure-button pure-button-primary`}
              onClick={this.submitVote}
            >
              {this.state.isSubmitting 
                ? 'Casting...' 
                : 'Cast your Vote'
              }
            </button>
          }

          {this.state.error && 
            <p className={styles.error}>{this.state.error.toString()}</p>
          }

          {this.state.hasVoted && 
            <h3>Thanks for voting!</h3>
          }

          {winner && 
            <h3>The winner is: {winner.name}</h3>
          }
        
        </div>
      </div>
    );
  }
}

export default Poll;
