.PHONY: all wurlitzer python jupyter

all: wurlitzer python jupyter
	;

wurlitzer:
	git clone https://github.com/minrk/wurlitzer.git
	cd wurlitzer; python setup.py install

python:
	python setup.py install

jupyter:
	cd jupyter-nbextension; make install
