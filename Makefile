.PHONY: all wurlitzer jupyter

all: wurlitzer jupyter
	;

wurlitzer:
	git clone https://github.com/minrk/wurlitzer.git
	cd wurlitzer; python setup.py install

jupyter:
	cd jupyter-nbextension; make install
