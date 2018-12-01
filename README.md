# Klampt-jupyter-extension

A [Jupyter notebook](http://jupyter.org) extension for [Klamp't](https://github.com/krishauser/Klampt).

## Installation

To make any use of this extension, you will need to install:

- [Jupyter notebook](http://jupyter.org) 
- Klamp't 0.8: follow the [installation instructions here](https://github.com/krishauser/Klampt).

To install the extension, you can simply enter

`sudo make all`

in this directory.

For more control, you can use the following Makefile targets:

- `wurlitzer`: The wurlitzer library for capturing C++ output in Python.  This is not strictly needed.
- `jupyter`: Installs the Jupyter notebook extension.

## Usage

Once installed, the Javascript frontend widget can be created by a `KlamptWidget`, which is defined in the `klampt.vis.ipython` module. 
Try typing `help(klampt.vis.ipython.KlamptWidget)` for more help.  The klampt.vis.ipython module also contains useful helper widgets
for editing robot configurations, points, transforms, and playback controls.

The best way to learn how to use this extension is to study the example notebooks, which are found in the [examples](examples/) subdirectory.

Auto-generated [documentation for the Klampt Python module can be found here](https://htmlpreview.github.io/?https://github.com/krishauser/Klampt-jupyter-extension/blob/master/widgets.html).


## Version history

0.1.0: first release
0.2.0: matching to Klampt 0.8.0 release (12/01/2018)
 - Python interface is now in Klampt, not this module.
 - Widget state can be saved a bit more reliably.
 - API is closer to the klampt.vis module.
 

## Wish list

- Saving standalone animations in HTML.
- Camera resetting in the GUI.
- More control over background color, lighting, textures.
- Live editing in the visualization.

## Contact

Author: Kris Hauser

Duke University

kris.hauser@duke.edu
