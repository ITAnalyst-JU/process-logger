#!/bin/bash

trap 'echo "Be patient"' INT

for i in {1..10}
do
  echo "Iteracja \\ #$i"
  sleep 1
done

