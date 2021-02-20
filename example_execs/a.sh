#!/bin/bash

# trap 'echo "Be patient"' INT

for i in {1..100000}
do
  echo "Iteracja \\ #$i"
  sleep 1
done

