.PHONY: all install install-user install-wurlitzer

all: install
	;

install-wurlitzer:
	git clone https://github.com/minrk/wurlitzer.git
	cd wurlitzer; python setup.py install

install:
	cd jupyter-nbextension; make install

install-user:
	cd jupyter-nbextension; make install-user
