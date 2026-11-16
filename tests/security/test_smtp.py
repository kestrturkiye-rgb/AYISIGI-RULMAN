import importlib.util,pathlib,unittest
path=pathlib.Path(__file__).resolve().parents[2]/'scripts/security/configure-smtp.py'
spec=importlib.util.spec_from_file_location('smtp_config',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class SmtpTests(unittest.TestCase):
 def settings(self):return {'RT_SMTP_HOST':'mail.kurumsaleposta.com','RT_SMTP_PORT':'465','RT_SMTP_USER':'info@example.test','RT_SMTP_PASSWORD':'dummy-test-secret','RT_SMTP_FROM':'info@example.test'}
 def test_verified_ssl_profile(self):
  patch=module.smtp_patch(self.settings());self.assertEqual(patch['smtp_port'],'465');self.assertEqual(patch['smtp_host'],'mail.kurumsaleposta.com');self.assertEqual(patch['smtp_sender_name'],'Rulman Teklif')
 def test_unencrypted_natro_port_is_rejected(self):
  settings=self.settings();settings['RT_SMTP_PORT']='587'
  with self.assertRaisesRegex(ValueError,'465'):module.smtp_patch(settings)
 def test_invalid_inputs_do_not_echo_secrets(self):
  for key,value in [('RT_SMTP_HOST','https://mail.kurumsaleposta.com/'),('RT_SMTP_USER','invalid'),('RT_SMTP_PORT','invalid')]:
   settings=self.settings();settings[key]=value
   with self.assertRaises(ValueError) as error:module.smtp_patch(settings)
   self.assertNotIn('dummy-test-secret',str(error.exception))
 def test_missing_password_blocks_configuration(self):
  settings=self.settings();del settings['RT_SMTP_PASSWORD']
  with self.assertRaisesRegex(ValueError,'RT_SMTP_PASSWORD'):module.smtp_patch(settings)
if __name__=='__main__':unittest.main()
