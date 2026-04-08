#!/bin/bash
cd /mnt/c/Users/singh/Downloads/midnight_hello

echo "Testing 26844 symbols..."

# Create the test contract template
cat << 'EOF' > /tmp/template.compact
pragma language_version 0.21;
import CompactStandardLibrary;
export circuit test(path: MerkleTreePath<32, Bytes<32>>): [] { FUNC_NAME(path); }
EOF

# Read symbols into an array to avoid subshell issues in the loop
mapfile -t symbols < /tmp/symbols.txt

success_count=0
for func in "${symbols[@]}"; do
  # Skip extremely short or obviously non-function symbols to save time
  if [ ${#func} -lt 3 ]; then continue; fi

  # Replace FUNC_NAME with the current symbol
  sed "s/FUNC_NAME/$func/g" /tmp/template.compact > /tmp/probe.compact

  # Run compiler and capture output
  out=$(compact compile /tmp/probe.compact /tmp/probe-out 2>&1)

  # If it doesn't say "unbound identifier", it's a known symbol
  if ! echo "$out" | grep -q 'unbound identifier'; then
    
    # Ignore parse errors which mask the type mismatch
    if ! echo "$out" | grep -E -q 'parse error|invalid context|runtime-only method'; then
      echo "EXISTS global $func -> $out"
      success_count=$((success_count + 1))
      
      # If it also doesn't say "expected... received MerkleTreePath", it might be the one!
      if ! echo "$out" | grep -q 'expected'; then
           echo "======================================"
           echo "JACKPOT: $func accepts MerkleTreePath!"
           echo "======================================"
           exit 0
      fi
    fi
  fi
done

echo "Finished testing symbols. Found $success_count global functions, but none accepted MerkleTreePath directly."
