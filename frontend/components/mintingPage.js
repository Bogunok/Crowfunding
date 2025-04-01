import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3Modal } from '@web3modal/react';
import StudentNFTABI from '../contracts/StudentNFT.json'; 

const CONTRACT_ADDRESS = '0x04874CA735f939bB258DF791283E4921E4C78237'; 

function MintPage() {
    const [recipientAddress, setRecipientAddress] = useState('');
    const [ipfsMetadataURI, setIpfsMetadataURI] = useState('');
    const [mintingStatus, setMintingStatus] = useState('');
    const { provider, isConnected } = useWeb3Modal();
    const [contract, setContract] = useState(null);

    useEffect(() => {
        async function initializeContract() {
            if (isConnected && provider) {
                try {
                    const signer = await provider.getSigner();
                    const studentNFTContract = new ethers.Contract(
                        CONTRACT_ADDRESS,
                        StudentNFTABI,
                        signer
                    );
                    setContract(studentNFTContract);
                } catch (error) {
                    console.error('Error initializing contract:', error);
                    setMintingStatus('Error initializing contract.');
                }
            } else {
                setContract(null);
            }
        }

        initializeContract();
    }, [isConnected, provider]);

    async function handleMintNFT() {
        if (!contract) {
            setMintingStatus('Connect your wallet first.');
            return;
        }

        setMintingStatus('Minting in progress...');

        try {
            const tx = await contract.mintNFT(recipientAddress, ipfsMetadataURI);
            console.log('Transaction hash:', tx.hash);
            await tx.wait();
            setMintingStatus('NFT minted successfully!');
        } catch (error) {
            console.error('Error minting NFT:', error);
            setMintingStatus(`Minting failed: ${error.message}`);
        }
    }

    return (
        <div className="container mx-auto p-8"> 
            <h1 className="text-2xl font-bold mb-4">Mint New Student NFT</h1>
            {!isConnected ? (
                <p className="mb-4">Please connect your wallet to mint NFTs.</p>
            ) : (
                <div className="bg-white shadow-md rounded-md p-6"> 
                    <div className="mb-4">
                        <label htmlFor="recipient" className="block text-gray-700 text-sm font-bold mb-2">Recipient Address:</label>
                        <input
                            type="text"
                            id="recipient"
                            value={recipientAddress}
                            onChange={(e) => setRecipientAddress(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="metadataURI" className="block text-gray-700 text-sm font-bold mb-2">IPFS Metadata URI:</label>
                        <input
                            type="text"
                            id="metadataURI"
                            value={ipfsMetadataURI}
                            onChange={(e) => setIpfsMetadataURI(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                        />
                    </div>
                    <button onClick={handleMintNFT} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"> {/* Style the button */}
                        Mint NFT
                    </button>
                    {mintingStatus && <p className="mt-4">{mintingStatus}</p>}
                </div>
            )}
        </div>
    );
}

export default MintPage;