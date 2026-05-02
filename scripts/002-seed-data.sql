-- Seed data for Physics Platform
-- Run this after creating tables

-- Insert categories
INSERT INTO categories (id, name, description, icon, order_index) VALUES
  ('cat-mechanics', 'الميكانيكا', 'دروس الحركة والقوى والطاقة', 'Atom', 1),
  ('cat-electricity', 'الكهربية', 'دروس الكهرباء والمغناطيسية', 'Zap', 2),
  ('cat-modern', 'الفيزياء الحديثة', 'النظرية النسبية وميكانيكا الكم', 'Sparkles', 3),
  ('cat-waves', 'الموجات والصوت', 'دروس الموجات والأصوات', 'Waves', 4),
  ('cat-optics', 'الضوء والبصريات', 'دروس الضوء والانعكاس والانكسار', 'Sun', 5)
ON CONFLICT (id) DO NOTHING;

-- Insert sample lessons
INSERT INTO lessons (title, description, video_url, duration, category_id, is_free, order_index) VALUES
  ('مقدمة في الحركة الخطية', 'تعرف على أساسيات الحركة في خط مستقيم', 'https://www.youtube.com/watch?v=example1', 45, 'cat-mechanics', true, 1),
  ('قوانين نيوتن للحركة', 'شرح مفصل لقوانين نيوتن الثلاثة', 'https://www.youtube.com/watch?v=example2', 60, 'cat-mechanics', false, 2),
  ('الشغل والطاقة', 'العلاقة بين الشغل والطاقة الحركية والكامنة', 'https://www.youtube.com/watch?v=example3', 55, 'cat-mechanics', false, 3),
  ('التيار الكهربي', 'مفهوم التيار الكهربي وقياسه', 'https://www.youtube.com/watch?v=example4', 50, 'cat-electricity', true, 1),
  ('قانون أوم', 'العلاقة بين الجهد والتيار والمقاومة', 'https://www.youtube.com/watch?v=example5', 40, 'cat-electricity', false, 2),
  ('المجال المغناطيسي', 'خصائص المجال المغناطيسي وتطبيقاته', 'https://www.youtube.com/watch?v=example6', 65, 'cat-electricity', false, 3),
  ('الموجات الميكانيكية', 'أنواع الموجات وخصائصها', 'https://www.youtube.com/watch?v=example7', 45, 'cat-waves', true, 1),
  ('انعكاس الضوء', 'قوانين انعكاس الضوء والمرايا', 'https://www.youtube.com/watch?v=example8', 50, 'cat-optics', false, 1),
  ('النظرية النسبية الخاصة', 'مقدمة في النظرية النسبية لأينشتاين', 'https://www.youtube.com/watch?v=example9', 70, 'cat-modern', false, 1);

-- Insert sample materials
INSERT INTO materials (title, description, file_url, file_size, category_id, is_free) VALUES
  ('ملخص الفصل الأول - الميكانيكا', 'ملخص شامل لجميع قوانين الحركة والقوى', '/files/mechanics-summary.pdf', 2500000, 'cat-mechanics', true),
  ('حلول تمارين الحركة الخطية', 'حلول تفصيلية لجميع تمارين الحركة', '/files/linear-motion-solutions.pdf', 3200000, 'cat-mechanics', false),
  ('ملخص الكهربية الساكنة', 'شرح مبسط للشحنات والمجالات الكهربية', '/files/electrostatics-summary.pdf', 1800000, 'cat-electricity', true),
  ('بنك أسئلة الفيزياء الحديثة', 'مجموعة أسئلة متنوعة مع الحلول', '/files/modern-physics-questions.pdf', 4100000, 'cat-modern', false),
  ('معادلات الموجات', 'جميع معادلات الموجات مع شرح مبسط', '/files/waves-equations.pdf', 1500000, 'cat-waves', true);

-- Insert sample announcements
INSERT INTO announcements (title, content, priority, target_audience, is_pinned) VALUES
  ('مرحباً بكم في المنصة', 'أهلاً بكم في منصة الفيزياء التعليمية. نتمنى لكم تجربة تعليمية ممتعة ومفيدة.', 'normal', 'all', true),
  ('درس جديد: قوانين نيوتن', 'تم إضافة درس جديد عن قوانين نيوتن للحركة. شاهدوه الآن!', 'high', 'all', false),
  ('عرض خاص للاشتراك السنوي', 'احصل على خصم 20% على الاشتراك السنوي حتى نهاية الشهر', 'urgent', 'free', true),
  ('تحديث الملخصات', 'تم تحديث ملخصات الفصل الأول بإضافة أمثلة جديدة', 'normal', 'premium', false);
