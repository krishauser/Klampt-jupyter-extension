#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Kris Hauser.
# Distributed under the terms of the Modified BSD License.

import pytest

from ..widget import KlamptModelWidget


def test_widget_creation_blank():
    w = KlamptModelWidget()
    assert w.value == 'Hello World'
