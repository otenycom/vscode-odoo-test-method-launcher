from odoo.tests import TransactionCase

class TestExample(TransactionCase):
    def setUp(self):
        super(TestExample, self).setUp()
        # Setup code here

    def test_example_function(self):
        # This is a test function that our extension will detect
        # Place your cursor here and press Ctrl+Alt+T (or Cmd+Alt+T on macOS)
        self.assertEqual(1, 1)

    def test_another_function(self):
        # This is another test function
        self.assertTrue(True) 