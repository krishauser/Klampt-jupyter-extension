# Klampt-jupyter-extension

A [Jupyter notebook](http://jupyter.org) extension for [Klamp't](https://github.com/krishauser/Klampt).

## Installation

To make any use of this extension, you will need to install:

- [Jupyter notebook](http://jupyter.org) 
- Klamp't 0.8.x Python API: follow the [installation instructions here](http://motion.pratt.duke.edu/klampt/pyklampt_docs/Manual-Installation.html).

To install the extension, you can simply enter

    `sudo make install`

or for a user-level install,

    `sudo make install-user`

in this directory.

If you are using Linux, we also recommended the wurlitzer library for capturing C++ output in Jupyter Notebook.  This will make error message easier to parse.  To do so, you can run `pip install wurlitzer` or 

    `sudo make install-wurlitzer`

in this directory.


## Usage

Once installed, the Javascript frontend widget can be created by a `KlamptWidget`, which is defined in the `klampt.vis.ipython` module. 
Try typing `help(klampt.vis.ipython.KlamptWidget)` for more help.  The klampt.vis.ipython module also contains useful helper widgets
for editing robot configurations, points, transforms, and playback controls.

The best way to learn how to use this extension is to study the example notebooks, which are found in the [Klampt-examples](https://github.com/krishauser/Klampt-examples) project under the `Jupyter` directory.


## Version history

0.2.0: matching to Klampt 0.8.0 release (12/31/2018)
 - Python interface is now in Klampt, not this module.
 - Widget state can be saved a bit more reliably.
 - API is closer to the klampt.vis module.

0.1.0: first release (8/1/2018)
 

## Wish list

- Saving standalone animations in HTML.
- Camera resetting in the GUI.
- More control over background color, lighting, textures.
- Live editing in the visualization.

## Contact

Author: Kris Hauser

Duke University

kris.hauser@duke.edu
