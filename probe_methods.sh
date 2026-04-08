#!/bin/bash
cd /mnt/c/Users/singh/Downloads/midnight_hello

for method in verify check checkPath verifyPath verifyRoot checkRoot root digest isMember checkMember member contains includes findPathForLeaf get value verifyProof checkProof; do
  cat << EOF > /tmp/probe.compact
pragma language_version 0.21;
import CompactStandardLibrary;
export ledger tree: MerkleTree<32, Bytes<32>>;
export circuit test(): [] { tree.$method(); }
EOF
  out=$(compact compile /tmp/probe.compact /tmp/probe-out 2>&1)
  if ! echo "$out" | grep -q 'undefined'; then
    echo "EXISTS MerkleTree.$method -> $out"
  fi
done

for func in root digest verify check computeRoot compute hash node computeDigest merkleRoot rootOf pathRoot getRoot; do
  cat << EOF > /tmp/probe.compact
pragma language_version 0.21;
import CompactStandardLibrary;
export circuit test(path: MerkleTreePath<32, Bytes<32>>): [] { $func(path); }
EOF
  out=$(compact compile /tmp/probe.compact /tmp/probe-out 2>&1)
  if ! echo "$out" | grep -q 'unbound identifier'; then
    echo "EXISTS global $func -> $out"
  fi
done

