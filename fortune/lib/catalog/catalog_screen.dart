import 'package:flutter/material.dart';

import '../theme.dart';
import 'catalog_api.dart';

/// 인증 없이 볼 수 있는 식재료 카탈로그. 상태는 로딩·결과·실패 셋뿐이다.
class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key, required this.api});

  final CatalogApi api;

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  List<Category> _categories = const [];
  List<Food> _foods = const [];
  int? _selectedCategoryId;
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _failed = false;
    });
    try {
      final categories = await widget.api.categories();
      final foods = await widget.api.foods(categoryId: _selectedCategoryId);
      if (!mounted) return;
      setState(() {
        _categories = categories;
        _foods = foods;
        _loading = false;
      });
    } catch (error) {
      // 조용히 빈 화면을 보여주면 "재료가 없다"와 구분되지 않는다.
      debugPrint('Catalog load failed: $error');
      if (!mounted) return;
      setState(() {
        _loading = false;
        _failed = true;
      });
    }
  }

  Future<void> _select(int? categoryId) async {
    setState(() => _selectedCategoryId = categoryId);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        title: const Text('식재료 둘러보기', style: TextStyle(color: kFg)),
        iconTheme: const IconThemeData(color: kFg),
      ),
      body: _failed ? _buildFailed() : _buildBody(),
    );
  }

  Widget _buildFailed() => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text('식재료를 불러오지 못했어요', style: TextStyle(color: kFg)),
        const SizedBox(height: 12),
        OutlinedButton(onPressed: _load, child: const Text('다시 시도')),
      ],
    ),
  );

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: kAccent));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 56,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: [
              _chip(label: '전체', id: null),
              for (final category in _categories)
                _chip(label: category.name, id: category.id),
            ],
          ),
        ),
        Expanded(
          child: _foods.isEmpty
              ? const Center(
                  child: Text(
                    '아직 등록된 식재료가 없어요',
                    style: TextStyle(color: kMutedFg),
                  ),
                )
              : ListView.separated(
                  itemCount: _foods.length,
                  separatorBuilder: (_, _) =>
                      const Divider(height: 1, color: kBorder),
                  itemBuilder: (_, index) {
                    final food = _foods[index];
                    return ListTile(
                      title: Text(
                        food.unit == null
                            ? food.name
                            : '${food.name} · ${food.unit}',
                        style: const TextStyle(color: kFg),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _chip({required String label, required int? id}) {
    final selected = _selectedCategoryId == id;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => _select(id),
        selectedColor: kAccent.withValues(alpha: 0.18),
        backgroundColor: Colors.white,
        side: const BorderSide(color: kBorder),
      ),
    );
  }
}
