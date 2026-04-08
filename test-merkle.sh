#!/bin/bash
cd /mnt/c/Users/singh/Downloads/midnight_hello

echo "Testing tree method (leaf, proof)..."
for method in checkPath check verifyPath verifyProof verify validate validatePath validateProof validateRoot contains includes isMember member checkInclusion check_inclusion; do
    cat << EOF > contracts/stone-drop-test.compact
pragma language_version 0.21;
import CompactStandardLibrary;
export ledger commitmentTree: HistoricMerkleTree<32, Bytes<32>>;
export circuit test(leaf: Bytes<32>, proof: MerkleTreePath<32, Bytes<32>>): [] {
  assert(commitmentTree.$method(leaf, proof), "fail");
}
EOF
    if compact compile contracts/stone-drop-test.compact contracts/managed/stone-drop-test >/dev/null 2>&1; then
        echo "======================================"
        echo "SUCCESS: Tree method (leaf, proof) => commitmentTree.$method(leaf, proof)"
        echo "======================================"
        exit 0
    fi
done

echo "Testing global verify function (leaf, proof, tree)..."
for func in verifyMerkleProof checkMerkleProof validateMerkleProof computeMerkleRoot calculateMerkleRoot merkleRoot checkRoot check verify verifyPath; do
    cat << EOF > contracts/stone-drop-test.compact
pragma language_version 0.21;
import CompactStandardLibrary;
export ledger commitmentTree: HistoricMerkleTree<32, Bytes<32>>;
export circuit test(leaf: Bytes<32>, proof: MerkleTreePath<32, Bytes<32>>): [] {
  assert($func(leaf, proof, commitmentTree), "fail");
}
EOF
    if compact compile contracts/stone-drop-test.compact contracts/managed/stone-drop-test >/dev/null 2>&1; then
        echo "======================================"
        echo "SUCCESS: Global verify function (leaf, proof, tree) => $func"
        echo "======================================"
        exit 0
    fi
done

echo "Checking if MerkleTreePath has a function or field to yield the root..."
for field in digest root field value computeRoot hash; do
    cat << EOF > contracts/stone-drop-test.compact
pragma language_version 0.21;
import CompactStandardLibrary;
export ledger commitmentTree: HistoricMerkleTree<32, Bytes<32>>;
export circuit test(leaf: Bytes<32>, proof: MerkleTreePath<32, Bytes<32>>): [] {
  assert(commitmentTree.checkRoot(proof.$field), "fail");
}
EOF
    if compact compile contracts/stone-drop-test.compact contracts/managed/stone-drop-test >/dev/null 2>&1; then
        echo "======================================"
        echo "SUCCESS: MerkleTreePath field/func => proof.$field"
        echo "======================================"
        exit 0
    fi
done

echo "Checking if checkRoot can take the MerkleTreePathEntry..."
cat << EOF > contracts/stone-drop-test.compact
pragma language_version 0.21;
import CompactStandardLibrary;
export ledger commitmentTree: HistoricMerkleTree<32, Bytes<32>>;
export circuit test(leaf: Bytes<32>, proof: MerkleTreePath<32, Bytes<32>>): [] {
  assert(commitmentTree.checkRoot(proof.path[0].sibling), "fail");
}
EOF
if compact compile contracts/stone-drop-test.compact contracts/managed/stone-drop-test >/dev/null 2>&1; then
    echo "======================================"
    echo "SUCCESS: checkRoot with proof.path[0].sibling works!!!"
    echo "======================================"
else
    echo "No matching method found in these targeted tests."
fi
rm contracts/stone-drop-test.compact 2>/dev/null
