import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3Modal } from '@web3modal/react';
import StudentNFTABI from '../contracts/StudentNFT.json';

const CONTRACT_ADDRESS = '0x04874CA735f939bB258DF791283E4921E4C78237';

function ViewNFTsPage() {
    const [mintedNFTs, setMintedNFTs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
                } catch (err) {
                    console.error('Error initializing contract:', err);
                    setError('Error initializing contract.');
                    setLoading(false);
                }
            } else {
                setContract(null);
            }
        }

        initializeContract();
    }, [isConnected, provider]);

    useEffect(() => {
        async function fetchMintedNFTs() {
            if (contract) {
                setLoading(true);
                setError(null);
                try {
                    const totalSupply = await contract.totalSupply();
                    const nfts = [];
                    for (let i = 0; i < totalSupply.toNumber(); i++) {
                        const tokenId = i;
                        const tokenURI = await contract.tokenURI(tokenId);
                        const response = await fetch(tokenURI);
                        const metadata = await response.json();
                        nfts.push({ tokenId, metadata });
                    }
                    setMintedNFTs(nfts);
                } catch (err) {
                    console.error('Error fetching minted NFTs:', err);
                    setError('Error fetching minted NFTs.');
                } finally {
                    setLoading(false);
                }
            }
        }

        fetchMintedNFTs();
    }, [contract]);

    if (loading) {
        return <div className="container mx-auto p-8"><p className="text-lg text-gray-600">Loading minted NFTs...</p></div>;
    }

    if (error) {
        return <div className="container mx-auto p-8"><p className="text-red-500 text-lg">Error: {error}</p></div>;
    }

    return (
        <div className="container mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">Minted Student NFTs</h1>
            {mintedNFTs.length === 0 ? (
                <p className="text-gray-600">No NFTs have been minted yet.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {mintedNFTs.map((nft) => (
                        <div key={nft.tokenId} className="bg-white rounded-lg shadow-md overflow-hidden">
                            <div className="p-4">
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">Token ID: {nft.tokenId}</h3>
                                {nft.metadata && (
                                    <div>
                                        {nft.metadata.image && (
                                            <img
                                                src={nft.metadata.image}
                                                alt={nft.metadata.name}
                                                className="w-full h-auto rounded-md mb-2"
                                            />
                                        )}
                                        {nft.metadata.name && <p className="text-gray-700 mb-1">Name: {nft.metadata.name}</p>}
                                        {nft.metadata.description && <p className="text-gray-600 text-sm mb-1">{nft.metadata.description}</p>}
                                    </div>
                                )}
                                {!nft.metadata && <p className="text-gray-500 text-sm">Metadata not found for this NFT.</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ViewNFTsPage;